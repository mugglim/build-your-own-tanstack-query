# Build Your Own TanStack Query and useQuery

## Intro

TanStack Query의 useQuery 커스텀 Hook을 직접 만들어보는 프로젝트입니다. [Tanner Linsley](https://github.com/tannerlinsley)의 [Let's Build React Query in 150 Lines of Code!](https://www.youtube.com/watch?v=9SrIirrnwk0) 발표의 내용을 참고하여 작성되었습니다.

최신 코드를 반영하기 위해 TanStack Query v5를 참고했습니다.

> [!WARNING]
>
> - TanStack Query 및 Let's Build React Query in 150 Lines of Code 발표의 코드와 완벽히 일치하지 않을 수 있습니다.

## TOC

- [Step1: core 로직 구현하기](#step1-core-로직-구현하기)

## **Play Locally**

**Install package**

```
npm install
```

**Run development server**

```jsx
npm run dev
```

## Architecture

> [!INFO]
> TanStack Query를 재작성한 코드를 ”tanstack-query-lite”로 부르겠습니다.

코드는 2가지 폴더의 코드로 분리되어 있습니다.

- **tanstack-query-lite/core**: 외부 환경에 의존되지 않는 코드입니다. QueryClient, QueryCache, Query, QueryObserver 객체가 포함됩니다.
- **tanstack-query-lite/react:** React 라이브러리에 의존되는 코드입니다. 내부적으로 core 폴더의 코드를 의존하고 있습니다.

---

## Step1: core 로직 구현하기

core 로직은 외부 환경에 의존되지 않는 코드입니다. React, Vue, Svelte 라이브러리의 생명주기에 적절히 core 로직을 적용하면, 동일한 기능을 제공할 수 있습니다.

core 코드는 QueryClient, QueryCache, Query, QueryObserver 4가지 객체로 구성되어 있습니다.

### QueryClient

QueryClient는 QueryCache를 의존하며, 데이터 패칭 및 캐시 무효화와 같은 기능을 제공합니다. 실질적인 기능은 대부분 참조하고 있는 객체에서 구현되어 있습니다. 예를 들어 데이터 패칭은 Query 객체가 수행합니다.

defaultOptions 값을 기반으로 Query의 기본 옵션을 전역으로 설정할 수 있습니다.

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

아래와 같이 QueryClient 객체를 생성하면, Query 객체의 staleTime 값은 기본적으로 Infinity로 할당됩니다.

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

QueryCache는 메모리에 Query 객체를 캐싱하는 역할을 담당합니다. Map 객체 기반으로 구현되어 있으며, queryKey 값을 해싱하여 key로 활용합니다.

- **key**: Query 객체의 queryKey 값을 기반으로 해싱된 값을 사용합니다. 해싱함수는 JSON.stringify 기반의 [hashKey](./tanstack-query-lite/core/util.js#L2) 함수를 사용합니다.
- **value**: Query 객체

QueryCache는 build 메소드를 기반으로 Query 객체를 추가합니다. 만약 queryKey 값에 해당하는 Query가 이미 존재한다면, 캐싱되어 있는 Query 객체를 반환하여 불필요한 Query 객체의 인스턴스 생성을 방지합니다.

```jsx
class QueryCache {
  queries;

  constructor() {
    /**
     * - key: queryHash (queryKey 값을 기반으로 생성됩니다.)
     * - value: Query object
     */
    this.queries = new Map();
  }

  get = (queryHash) => {
    return this.queries.get(queryHash);
  };

  build(client, options) {
    const queryKey = options.queryKey;****
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

Query 객체는 서버 상태를 관리합니다. 서버 상태 관리는 서버 상태를 저장하고, 서버 상태를 조회하는 역할을 의미합니다. 옵저버 패턴으로 구독을 허용하고 있으며, 서버 상태가 변경될 때 구독자들에게 이벤트를 발행합니다.

**서버 상태 조회 로직은 어떻게 동작할까요?**

fetch 메소드를 제공하여 서버 상태를 조회합니다. 서버 상태 조회 로직은 Query 객체 생성 시점에 전달되는 queryFn 함수를 사용합니다. fetch 메소드가 호출될 때 마다 서버 상태 요청이 발생하지 않도록, Promise 객체를 promise 멤버 변수로 관리합니다. 요청의 상태에 promise 멤버 변수를 상태를 정리해 봅시다.

- 요청 발생: queryFn 함수 기반으로 생성된 Promise 객체를 promise 멤버 변수에 할당합니다.
- 요청 중: promise 멤버 변수의 값을 반환합니다. (Promise 객체를 새롭게 생성하지 않습니다.)
- 요청 완료: promise 멤버 변수를 null로 초기화합니다.

**staleTime은 어떻게 동작하는가?**

서버 상태가 마지막으로 변경된 시점을 timestamp 기반의 lastUpdated 멤버 변수로 저장하고 있습니다. fetch 메소드가 실행되기 전 `Date.now() - lastUpdated` 값과 staleTime를 비교하여, fetch 메소드 실행 여부를 판단합니다.

```jsx
const diffUpdatedAt = Date.now() - lastUpdated;
const needsToFetch = diffUpdatedAt > staleTime;

if (needsToFetch) {
  query.fetch();
}
```

**gcTime은 어떻게 동작하는가?**

객체가 생성되는 시점에 [setTimeout](https://developer.mozilla.org/ko/docs/Web/API/Window/setTimeout)를 사용하여 scheduleGcTimeout 메소드를 통해 gc를 관리합니다. gcTime timeout이 호출되면 QueryCache에게 제거를 요청합니다.

구독이 발생될 때 마다 clearGcTimeout 메소드를 사용하여 timeout이 초기화됩니다. 만약 구독이 해제될 때 구독자 리스트의 길이가 0 이라면, scheduleGcTimeout이 다시 실행됩니다.

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

    // Query 객체 생성 시점에 QueryCache에게 gc를 요청합니다.
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

    // 구독이 발생할 때 gc 요청을 해제합니다.
    this.clearGcTimeout();

    const unsubscribe = () => {
      this.observers = this.observers.filter(() => {
        return d !== observer;
      });

      // 구독이 해제되는 시점에 구독 리스트의 길이가 0 이라면, QueryCache에게 gc를 다시 요청합니다.
      if (!this.observers.length) {
        this.scheduleGcTimeout();
      }
    };

    return unsubscribe;
  };

  setState = (updater) => {
    this.state = updater(this.state);

    this.observers.forEach((observer) => {
      // 상태가 변경될 때, 구독자들에게 상태 변경 이벤트를 발행합니다.
      observer.notify();
    });
  };

  fetch = () => {
    // promise 객체를 멤버 변수로 활용하여, 불필요한 요청을 방지합니다.
    if (!this.promise) {
      this.promise = (async () => {
        this.setState((old) => ({ ...old, isFetching: true, error: undefined }));

        try {
          if (!this.options.queryFn) {
            throw new Error(`Missing queryFn: '${this.options.queryHash}'`);
          }

          const data = await this.options.queryFn();

          this.setState((old) => ({ ...old, status: "success", data }));
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

QueryObserver는 Query 객체를 구독하는 객체입니다. queryKey 값을 기반으로 Query 객체를 직접적으로 의존할 수 있으며, Query 객체의 상태가 변경될 때 마다 이벤트를 발행받아 notify 메소드를 실행시킵니다.

QueryObserver는 Query와 동일하게 옵저버 패턴을 기반으로 구독을 허용하고 있습니다. 구독이 발생할 때 Query 객체의 fetch 메소드를 실행하여 최신 서버 상태를 조회하도록 요청합니다.

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
    // options의 queryKey 값을 기반으로 구독되어 있는 Query를 조회합니다.
    const query = this.client.getQueryCache().build(this.client, this.options);

    return query;
  };

  getResult = () => {
    // Query 객체에서 관리하고 있는 서버 상태를 조회합니다.
    return this.getQuery().state;
  };

  subscribe = (callback) => {
    // Query 객체의 서버 상태가 변경될 때 호출이 필요한 callback 함수를 notify 멤버 변수로 저장합니다.
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

## Step2: React에서 core 로직 적용하기

React에서 core 로직을 사용하는 경우, Query 객체의 상태가 변경될 때 컴포넌트의 다시 렌더링을 발생시켜야 합니다. 아쉽게도 core 로직은 React로 작성된 코드가 아닙니다. Query 객체의 상태가 변경되더라도 다시 렌더링이 발생하지는 않습니다.

### Query 객체 상태가 변경될 떄 다시 렌더링을 발생시키기

React는 외부 상태를 구독할 수 있는 [useSyncExternalStore](https://ko.react.dev/reference/react/useSyncExternalStore) 커스텀 Hook을 제공하고 있습니다. 외부 상태 변경을 구독할 수 있으며, 상태 값이 변경될 때 마다 다시 렌더링이 발생됩니다.

QueryObserver를 useSyncExternalStore와 연동하면 Query의 최신 상태를 구독할 수 있고, Query 상태가 변경될 때 마다 다시 렌더링을 발생시킬 수 있습니다. 코드로 간단히 구현해보면 아래와 같습니다.

```jsx
const useQuery = () => {
  const [queryObserver] = useState(() => new QueryObserver());

  useSyncExternalStore(
    // subscribe
    useCallback((onStoreChange) => {
      // Query 객체를 생성하고, Query 객체의 상태가 변경될 때 onStoreChange 함수를 호출한다.
      const unsubscribe = queryObserver.subscribe(onStoreChange);

      return unsubscribe;
    }, []),
    // onStoreChange 함수가 호출될 때 Object.is로 이전 값과 최신 값을 비교하여, 다시 렌더링을 발생시킨다.
    () => queryObserver.getResult()
  );

  return queryObserver.getResult();
};
```

Query 객체의 상태가 변경되고 다시 렌더링이 발생하는 흐름을 정리해 보면 아래와 같습니다.

1. QueryObserver를 생성한다.
   1. Query 객체에 생성한다.
   2. Query 객체에 구독한다. 구독할 때 notify 멤버 변수가 useSyncExternalStore의 onStoreChange로 할당된다.
   3. Query 객체에게 fetch 메소드를 요청한다. (서버 상태 조회)
2. Query에서 fetch 함수가 종료된 후 서버 상태를 변경한다.
3. Query는 구독되어 있는 QueryObserver의 notify를 실행한다.
   1. useSyncExternalStore의 onStoreChange가 실행된다.
   2. QueryObserver는 getResult 함수를 통해 최신 상태를 반환하고 다시 렌더링을 발생시킨다.

---

QueryObserver 생성 및 useSyncExternalStore 처리 로직은 useBaseQuery에 작성되어 있으며, useQuery는 useBaseQuery의 실행값을 반환합니다.

이제 core 로직을 React에서 활용할 수 있는 방법을 조금 더 알아보려고 합니다.

### QueryClientProvider

QueryClient는 전역으로 접근할 수 있는 객체입니다. Context를 이용하여 QueryClient를 전역으로 접근할 수 있도록 Provider와 커스텀 Hook을 작성해봅니다.

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

최상위 컴포넌트에서 QueryClientProvider를 선언하면, 전역에서 QueryClient를 접근할 수 있습니다.

```jsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1_000,
      gcTime: 1_000 * 60
    }
  }
});

// 최상위 컴포넌트
const App = ({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
```

### useQuery

useQuery는 QueryObserver 객체를 이용하여 서버 상태를 관리하는 커스텀 Hook입니다.

```jsx
const useBaseQuery = (options, Observer, queryClient) => {
  const client = useQueryClient(queryClient);

  const [observer] = useState(() => {
    const defaultOptions = client.defaultQueryOptions(options);
    return new Observer(client, defaultOptions);
  });

  const subscribe = useCallback(
    (onStoreChange) => {
      // Query 객체의 상태가 변경될 때 onStoreChange 메소드가 호출됩니다.
      const unsubscribe = observer.subscribe(onStoreChange);
      return unsubscribe;
    },
    [observer]
  );

  const getSnapshot = useCallback(() => {
    // Object.is 를 기반으로 다시 렌더링 여부를 판단합니다.
    return observer.getResult();
  }, [observer]);

  // core 로직과 React를 연결합니다.
  useSyncExternalStore(subscribe, getSnapshot);

  return observer.getResult();
};

const useQuery = (options, queryClient) => {
  return useBaseQuery(options, QueryObserver, queryClient);
};
```

## Step3: 추가적인 기능 개발해보기

### 1. focus 상태가 변경될 때 refetch를 발생시키기

**설명**

refetchOnWindowFocus와 비슷한 기능을 구현해봅니다.

**요구사항**

- [ ] 브라우저의 focus 상태가 변경될 때 Query 객체의 fetch 메소드를 호출합니다.

**코드**

QueryCache 객체 와 QueryClientProvider 컴포넌트 로직을 일부 수정하면 해결할 수 있습니다.

**_core/QueryCache.ts_**

- onFocus 메소드가 호출될 때, 캐싱되어 있는 모든 Query 객체의 fetch 함수를 실행합니다.

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

- visibilitychange 또는 focus 이벤트가 발생할 때 QueryCache의 onFocus 메소드를 호출합니다.
- cache.onFocus 이벤트가 발생하면 캐싱되어 있는 모든 Query 객체의 fetch 메소드가 호출됩니다.

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

### 2. 개발자 도구 만들어보기 (ReactQueryDevtools)

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
  // ...
  setState() {
    // ...

    // QueryCache에게 이벤트를 발행합니다.
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

**src/main.jsx**

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

---

## Reference

- [Let's Build React Query in 150 Lines of Code!](https://www.youtube.com/watch?v=9SrIirrnwk0)
- [Inside React Query](https://tkdodo.eu/blog/inside-react-query)
