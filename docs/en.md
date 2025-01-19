# Build Your Own TanStack Query and useQuery

> [!IMPORTANT]
>
> - **This content has been summarized by AI.**
> - **If you find any awkward phrasing, we would appreciate it if you could report it as an issue!**

## Introduction

We are going to rewrite TanStack Query and useQuery from scratch, based on the concepts and code presented in [Let's Build React Query in 150 Lines of Code!](https://www.youtube.com/watch?v=9SrIirrnwk0) and TanStack Query v5.

> [!WARNING]
>
> - It may not match the TanStack Query code perfectly.

## TOC

- [Play Locally](#play-locally)
- [Architecture](#architecture)
- [Step 1: Core Implementation](#step-1-core-implementation)
- [Step 2: Integrating With React](#step-2-integrating-with-react)
- [Step 3: Additional Features](#step-3-additional-features)
- [Reference](#reference)

## Play Locally

**Install package**

```
npm install
```

**Run development server**

```
npm run dev
```

**Demo**

https://github.com/user-attachments/assets/11454b80-034a-4205-b051-5a3c78f1b9d0

## Architecture

> [!NOTE]
> The rewritten version of TanStack Query will be referred to as 'tanstack-query-lite'.

The code is separated into two folders of code.

- **tanstack-query-lite/core**: General code which can be used any library. They include QueryClient, QueryCache, Query, and QueryObserver objects.
- **tanstack-query-lite/react:** Code which depends on the React library. They depends on core code.

## Step 1: Core Implementation

Core is the code that doesn't depend on any library. You can use core code in React, Vue, and Svelte libraries.

They include QueryClient, QueryCache, Query, and QueryObserver objects.

### QueryClient

The QueryClient depend on the QueryCache and provides functionality such as data fetching and cache invalidation. The main functionality is implemented in the objects it references. For example, data fetching is implemented in the Query object.

> What is the defaultOptions?

It is default options for Query to be used globally.

```jsx
class QueryClient {
  cache;

  constructor(config) {
    this.cache = config.cache || new QueryCache();
    this.defaultOptions = config.defaultOptions;
  }

  getQueryCache = () => {
    return this.cache;
  };

  defaultQueryOptions = (options) => {
    const mergedQueryOptions = {
      ...this.defaultOptions?.queries,
      ...options
    };

    const defaultedQueryOptions = {
      ...mergedQueryOptions,
      queryHash: mergedQueryOptions.queryHash || hashKey(mergedQueryOptions.queryKey)
    };

    return defaultedQueryOptions;
  };
}
```

QueryClient object is created as shown below, the staleTime of the Query is set to Infinity by default.

```jsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity
    }
  }
});
```

### QueryCache

The QueryCache cache Query objects in memory. It is based on a Map object and queryKey is used as keys.

- key: The hashed value derived from the queryKey. The [hashKey](./tanstack-query-lite/core/util.js#L2) hash function uses JSON.stringify.
- value: The Query object.

> Which method does QueryCache use to add a Query?

It uses the build method to add Query objects. If a query is cached, the cached Query object is returned to avoid creation of new instance.

```jsx
class QueryCache {
  queries;

  constructor() {
    /**
     * - key: queryHash (created by queryKey)
     * - value: Query object
     */
    this.queries = new Map();
  }

  get = (queryHash) => {
    return this.queries.get(queryHash);
  };

  build(client, options) {
    const queryKey = options.queryKey;
    const queryHash = hashKey(queryKey);

    let query = this.get(queryHash);

    if (!query) {
      query = new Query({
        cache: this,
        queryKey,
        queryHash,
        options: client.defaultQueryOptions(options)
      });

      this.queries.set(query.queryHash, query);
    }

    return query;
  }

  remove = (query) => {
    this.queries.delete(query.queryHash);
  };
}
```

### Query

The Query object manages server state. Server state management involves storing and fetching server state. It supports the observer pattern, allowing subscribers to receive events whenever the server state changes.

> How does the server state fetching logic work?

The Query object provides a fetch method to fetch server state. The server state fetching logic uses the queryFn function, which is passed when Query object is created. To avoid repeated server state requests every time the fetch method is called, the promise member variable is used to manage the request's state. Below is a breakdown of how the promise member variable works during the request lifecycle:

- **Request Initiated**: A Promise object, created based on the queryFn function, is assigned to the promise member variable.
- **Request In Progress**: The value of the promise member variable is returned (a new Promise object is not created).
- **Request Completed**: The promise member variable is reset to null.

> How does staleTime work?

The time when the server state was last updated is stored in the lastUpdated member variable as a timestamp. Before the fetch method executes, the value of `Date.now() - lastUpdated` is compared with staleTime. This comparison determines whether the fetch method should be executed.

```jsx
const diffUpdatedAt = Date.now() - lastUpdated;
const needsToFetch = diffUpdatedAt > staleTime;

if (needsToFetch) {
  query.fetch();
}
```

> gcTime: How does it work?

At the time of Query object creation, garbage collection (GC) is managed via the scheduleGcTimeout method, which uses [setTimeOut](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout). When the gcTime timeout is triggered, the QueryCache is requested to remove the object.

Every time a subscription occurs, the timeout is reset using the clearGcTimeout method. If a subscriber unsubscribes and the subscriber list becomes empty, the scheduleGcTimeout method is executed again.

```jsx
class Query {
  cache;
  queryKey;
  queryHash;
  options;
  observers;
  state;
  promise;
  gcTimeout;

  constructor(config) {
    this.observers = [];
    this.cache = config.cache;
    this.queryHash = config.queryHash;
    this.queryKey = config.queryKey;
    this.options = {
      ...config.defaultOptions,
      ...config.options
    };
    this.state = {
      data: undefined,
      error: undefined,
      status: "pending",
      isFetching: true,
      lastUpdated: undefined
    };

    this.scheduleGcTimeout();
  }

  scheduleGcTimeout = () => {
    const { gcTime } = this.options;

    this.gcTimeout = setTimeout(() => {
      this.cache.remove(this);
    }, gcTime);
  };

  clearGcTimeout = () => {
    clearTimeout(this.gcTimeout);
    this.gcTimeout = null;
  };

  subscribe = (observer) => {
    this.observers.push(observer);

    this.clearGcTimeout();

    const unsubscribe = () => {
      this.observers = this.observers.filter(() => {
        return d !== observer;
      });

      if (!this.observers.length) {
        this.scheduleGcTimeout();
      }
    };

    return unsubscribe;
  };

  setState = (updater) => {
    this.state = updater(this.state);

    this.observers.forEach((observer) => {
      observer.notify();
    });
  };

  fetch = () => {
    if (!this.promise) {
      this.promise = (async () => {
        this.setState((old) => ({ ...old, isFetching: true, error: undefined }));

        try {
          if (!this.options.queryFn) {
            throw new Error(`Missing queryFn: '${this.options.queryHash}'`);
          }

          const data = await this.options.queryFn();

          this.setState((old) => ({ ...old, status: "success", data, lastUpdated: Date.now() }));
        } catch (error) {
          this.setState((old) => ({ ...old, status: "error", error }));
        } finally {
          this.setState((old) => ({ ...old, isFetching: false }));

          this.promise = null;
        }
      })();
    }

    return this.promise;
  };
}
```

### QueryObserver

QueryObserver is an object that subscribes to a Query object. It directly depends on the Query object based on the queryKey value and executes the notify method whenever the state of the Query object changes.

QueryObserver also supports subscriptions based on the observer pattern, just like the Query. When a subscription occurs, it calls the fetch method of the Query object to request the latest server state.

```jsx
class QueryObserver {
  client;
  options;
  notify;

  constructor(client, options) {
    this.client = client;
    this.options = options;
  }

  getQuery = () => {
    const query = this.client.getQueryCache().build(this.client, this.options);

    return query;
  };

  getResult = () => {
    return this.getQuery().state;
  };

  subscribe = (callback) => {
    this.notify = callback;

    const query = this.getQuery();

    const { lastUpdated } = query.state;
    const { staleTime } = this.options;

    const needsToFetch = !lastUpdated || Date.now() - lastUpdated > staleTime;

    const unsubscribeQuery = query.subscribe(this);

    if (needsToFetch) {
      query.fetch();
    }

    const unsubscribe = () => {
      unsubscribeQuery();
    };

    return unsubscribe;
  };
}
```

<kbd>[Move to TOC](#TOC)</kbd>

## Step 2: Integrating With React

When using core logic in React, components need to re-render whenever the state of the Query object changes. Unfortunately, the core logic itself is not written in React. This means that even if the state of the Query object changes, React will not trigger a re-render.

### Triggering Re-renders When Query Object State Changes

React provides the custom hook [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) for subscribing to external state changes. It allows re-rendering whenever the external state changes.

By integrating QueryObserver with useSyncExternalStore, you can subscribe to the latest state of a Query and trigger a re-render whenever the Query state changes. Here’s a simple implementation in code:

```jsx
const useQuery = () => {
  const [queryObserver] = useState(() => new QueryObserver());

  useSyncExternalStore(
    useCallback((onStoreChange) => {
      const unsubscribe = queryObserver.subscribe(onStoreChange);

      return unsubscribe;
    }, []),
    () => queryObserver.getResult()
  );

  return queryObserver.getResult();
};
```

Flow of re-renders when query object state changes is below.

1. **Create a QueryObserver**:
   - (1-1) Create a Query object (skip this step if a cached Query already exists).
   - (1-2) Subscribe the QueryObserver to the Query object. When subscribing, the notify member variable is assigned to onStoreChange from useSyncExternalStore.
   - (1-3) Request the fetch method from the Query object (the fetch method may not execute if staleTime is not exceeded).
2. After the fetch function in the Query completes, the server state is updated.
3. The Query executes the notify function for all subscribed QueryObserver objects:
   - (3-1) onStoreChange from useSyncExternalStore is executed.
   - (3-2) The QueryObserver returns the latest state using the getResult function, triggering a re-render.

Now let’s explore more ways to use the core logic in React.

### QueryClientProvider

The QueryClient is an object accessible globally. By using Context, you can create a Provider and custom hook to make QueryClient globally accessible.

```jsx
export const QueryClientContext = createContext(null);

export const QueryClientProvider = ({ client, children }) => {
  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
};

export const useQueryClient = (queryClient) => {
  const client = useContext(QueryClientContext);

  if (queryClient) {
    return queryClient;
  }

  if (!client) {
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  }

  return client;
};
```

When you declare a QueryClientProvider at the top-level component, the QueryClient becomes globally accessible.

```jsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1_000,
      gcTime: 1_000 * 60
    }
  }
});

const App = ({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
```

### useQuery

useQuery is a custom hook that manages server state using a QueryObserver object.

The logic for creating a QueryObserver and handling useSyncExternalStore is written in useBaseQuery. useQuery simply returns the result of executing useBaseQuery.

```jsx
const useBaseQuery = (options, Observer, queryClient) => {
  const client = useQueryClient(queryClient);

  const [observer] = useState(() => {
    const defaultOptions = client.defaultQueryOptions(options);
    return new Observer(client, defaultOptions);
  });

  const subscribe = useCallback(
    (onStoreChange) => {
      const unsubscribe = observer.subscribe(onStoreChange);
      return unsubscribe;
    },
    [observer]
  );

  const getSnapshot = useCallback(() => {
    return observer.getResult();
  }, [observer]);

  useSyncExternalStore(subscribe, getSnapshot);

  return observer.getResult();
};

const useQuery = (options, queryClient) => {
  return useBaseQuery(options, QueryObserver, queryClient);
};
```

<kbd>[Move to TOC](#TOC)</kbd>

## Step 3: Additional Features

### 1. Triggering Refetch on Focus State Changes

**Description**

Implement functionality similar to refetchOnWindowFocus.

**Requirements**

- [ ] Call the fetch method of the Query object whenever the browser’s focus state changes.

**Code**

You can achieve this by modifying the logic in the QueryCache object and the QueryClientProvider component.

**_core/QueryCache.ts_**

- Execute the fetch function of all cached Query objects whenever the onFocus method is called.

```jsx
class QueryCache {
  // ...
  getAll = () => {
    const queries = this.queries.values();

    return [...queries];
  };

  onFocus = () => {
    const queries = this.getAll();

    queries.forEach((query) => {
      query.fetch();
    });
  };
}
```

**_react/QueryClientProvider.jsx_**

- Call the onFocus method of the QueryCache whenever a visibilitychange or focus event occurs.
- When the cache.onFocus event occurs, the fetch method of all cached Query objects is executed.

```jsx
export const QueryClientProvider = ({ children, client }) => {
  useEffect(() => {
    const cache = client.getQueryCache();

    const onFocus = () => {
      cache.onFocus();
    };

    window.addEventListener("visibilitychange", onFocus, false);
    window.addEventListener("focus", onFocus, false);

    return () => {
      window.addEventListener("visibilitychange", onFocus, false);
      window.addEventListener("focus", onFocus, false);
    };
  }, [client]);

  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
};
```

### 2. Creating a Developer Tool (ReactQueryDevtools)

**Description**

Build a developer tool similar to [ReactQueryDevTools](https://tanstack.com/query/v5/docs/framework/react/devtools) from TanStack Query.

**Requirements**

- [ ] Display the status, staleTime, and gcTime information of all cached Query objects.
- [ ] Update the list of cached Query objects whenever changes occur.

**Code**

To detect changes in cached Query objects, implement the observer pattern in QueryCache.

**_core/QueryCache.js_**

```jsx
class QueryCache {
  listeners;

  constructor() {
    // ...

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

**_core/Query.js_**

The Query calls the notify method of the QueryCache whenever the server state changes, publishing events to all subscribers of the QueryCache.

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

**_react/ReactQueryDevtools.jsx_**

The ReactQueryDevtools retrieves the list of cached Query objects through the QueryCache. Whenever server state changes, the tool updates the state of the Query list and triggers a re-render

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

Render the ReactQueryDevtools in the root component to see the developer tools in action.

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

## Reference

- [Let's Build React Query in 150 Lines of Code!](https://www.youtube.com/watch?v=9SrIirrnwk0)
- [Inside React Query](https://tkdodo.eu/blog/inside-react-query)

<kbd>[Move to TOC](#TOC)</kbd>
