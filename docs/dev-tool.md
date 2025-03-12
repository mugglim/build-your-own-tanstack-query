# DevTools

**설명**

TanStack Query의 [ReactQueryDevTools](https://tanstack.com/query/v5/docs/framework/react/devtools)를 만들어봅니다.

**요구사항**

- [ ] 캐싱 되어 있는 Query의 status, staleTime, gcTime 정보가 표시됩니다.
- [ ] 캐싱 되어 있는 Query의 변화가 발생하면 최신 Query 목록을 갱신합니다.

**코드**

QueryCache에 캐싱 되어 있는 Query의 변화를 감지하기 위해, QueryCache에 옵저버 패턴을 적용합니다.

**_core/QueryCache.js_**

```jsx
class QueryCache {
  listeners;

  constructor() {
    // ...

    // 이벤트를 발행할 구독자들을 저장합니다.
    this.listeners = new Set();
  }

  // ...

  // 이벤트를 발행할 구독자를 추가합니다.
  subscribe = (listener) => {
    this.listeners.add(listener);

    const unsubscribe = () => {
      this.listeners.delete(listener);
    };

    return unsubscribe;
  };

  // 이벤트를 발행합니다.
  notify = () => {
    this.listeners.forEach((callback) => {
      callback();
    });
  };
}
```

**_core/Query.js_**

Query는 서버 상태가 변경될 때 QueryCache의 notify 메소드를 호출하여, QueryCache에 구독되어 있는 구독자들에게 이벤트를 발행합니다.

```jsx
class Query {
  scheduleGcTimeout = () => {
    // ...
    this.gcTimeout = setTimeout(() => {
      // gc 시점에 QueryCache에게 이벤트를 발행합니다
      this.cache.notify();
    }, gcTime);
  };

  setState() {
    // ...

    // 상태 변경되면 QueryCache에게 이벤트를 발행합니다.
    this.cache.notify();
  }
}
```

**_react/ReactQueryDevtools.jsx_**

ReactQueryDevtools는 QueryCache를 통해 캐싱되어 있는 Query 목록을 조회합니다. 서버 상태가 변경될 때 Query 목록의 상태를 갱신하기 위해 다시 렌더링됩니다.

```jsx
const ReactQueryDevtools = () => {
  const queryClient = useQueryClient();

  // rerender 함수를 호출하면 다시 렌더링이 발생합니다.
  const [, rerender] = useReducer((i) => i + 1, 0);

  useEffect(() => {
    // QueryCache에서 notify 이벤트가 발행되면 rerender 함수를 호출합니다.
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

루트 컴포넌트에 ReactQueryDevtools를 렌더링하면, DevTools가 동작하는 것을 확인하실 수 있습니다.

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
