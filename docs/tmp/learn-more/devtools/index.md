# ReactQueryDevTools

## Explanation

Let's build the [ReactQueryDevTools](https://tanstack.com/query/v5/docs/framework/react/devtools) for TanStack Query.

## Requirements

- Display the cached `Query`'s status, staleTime, and gcTime information.
- Refresh the list of cached `Query` objects whenever changes occur.

## Solution

To detect changes in the cached `Query` objects inside the `QueryCache`, apply a subscription feature to `QueryCache`.

### QueryCache

```jsx
class QueryCache {
  listeners;

  constructor() {
    this.listeners = new Set();
  }

  subscribe = (listener) => {
    this.listeners.add(listener);

    const unsubscribe = () => {
      this.listeners.delete(listener);
    };

    return unsubscribe;
  };

  notify = () => {
    this.listeners.forEach((callback) => {
      callback();
    });
  };
}
```

### Query

`Query` calls the `notify` method of `QueryCache` whenever the server state changes. This method publishes events to all subscribers registered to the `QueryCache`.

```jsx
class Query {
  scheduleGcTimeout = () => {
    // ...
    this.gcTimeout = setTimeout(() => {
      this.cache.notify();
    }, gcTime);
  };

  setState() {
    // ...
    this.cache.notify();
  }
}
```

### ReactQueryDevtools

ReactQueryDevtools accesses the list of cached `Query` objects through the `QueryCache`. It re-renders to update the `Query` list state whenever the server state changes.

```jsx
const ReactQueryDevtools = () => {
  const queryClient = useQueryClient();

  const [, rerender] = useReducer((i) => i + 1, 0);

  useEffect(() => {
    return queryClient.cache.subscribe(rerender);
  }, [queryClient]);

  const queries = queryClient.getQueryCache().getAll();
  const sortedQueries = [...queries].sort((a, b) => (a.queryHash > b.queryHash ? 1 : -1));

  return (
    <div className="fixed bottom-0 w-full overflow-scroll text-white bg-black divide-y-2 divide-gray-800 divide-solid">
      {sortedQueries.map((query) => {
        const { queryKey, queryHash, state, observers, options } = query;
        const { isFetching, status } = state;

        const { staleTime, gcTime } = options;

        return (
          <div key={queryHash} className="p-2">
            {JSON.stringify(queryKey, null, 2)}, {JSON.stringify({ staleTime, gcTime }, null, 2)} -{" "}
            <span className="font-bold">
              {(() => {
                if (isFetching) {
                  return <span className="text-blue-500">fetching</span>;
                }

                if (!observers.length) {
                  return <span className="text-gray-500">inactive</span>;
                }

                if (status === "success") {
                  return <span className="text-green-500">success</span>;
                }

                if (status === "error") {
                  return <span className="text-red-500">error</span>;
                }

                return null;
              })()}
            </span>
          </div>
        );
      })}
    </div>
  );
};
```

**_src/main.jsx_**

Rendering `ReactQueryDevtools` in the top-level component allows you to verify that the DevTools work correctly.

```jsx
const App = ({ children }) => {
  return (
    <QueryClientContext.Provider value={client}>
      <ReactQueryDevtools />
      {children}
    </QueryClientContext.Provider>
  );
};
```
