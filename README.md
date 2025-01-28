<div align="center">
  <h1> Build Your Own TanStack Query and useQuery</h1>
</div>

<p align="center">
  <a href="./docs/ko.md">한국어</a> | <a href="/README.md">English</a>
</p>

## Introduction

We're going to rewrite TanStack Query and useQuery from scratch. We'll be using the ideas and code from [Let's Build React Query in 150 Lines of Code!](https://www.youtube.com/watch?v=9SrIirrnwk0) and TanStack Query v5.

> [!WARNING]
>
> - **It may not match the TanStack Query exactly.**

> [!IMPORTANT]
>
> - **This content is translated by AI.**
> - **Please feel free to report it as an issue if you find any awkward wording**

## TOC

- [Introduction](#introduction)
- [TOC](#toc)
- [Play Locally](#play-locally)
- [Architecture](#architecture)
- [Step 1: Core Implementation](#step-1-core-implementation)
  - [QueryClient](#queryclient)
  - [QueryCache](#querycache)
  - [Query](#query)
  - [QueryObserver](#queryobserver)
- [Step 2: Integration with React](#step-2-integration-with-react)
  - [Trigger re-render when the state of Query changes](#trigger-re-render-when-the-state-of-query-changes)
  - [QueryClientProvider](#queryclientprovider)
  - [useQuery](#usequery)
- [Step 3: Additional Features](#step-3-additional-features)
  - [1. Trigger refetch when the browser’s focus state changes](#1-trigger-refetch-when-the-browsers-focus-state-changes)
  - [2. Creating a developer tool like ReactQueryDevtools](#2-creating-a-developer-tool-like-reactquerydevtools)
- [Reference](#reference)

## Play Locally

Install package

```
npm install
```

Run development server

```
npm run dev
```

**Demo**

https://github.com/user-attachments/assets/11454b80-034a-4205-b051-5a3c78f1b9d0

## Architecture

> [!NOTE]
> We'll call the rewritten code tanstack-query-lite.

- **tanstack-query-lite/core**: General code that can be used by any library. It includes the QueryClient, QueryCache, Query, and QueryObserver.
- **tanstack-query-lite/react:**: Code that depends on the React. You can use core code in React.

<p align="center">
  <img src="./docs/architecture.png" height="500px">
<p align="center">

## Step 1: Core Implementation

Core doesn't depend on any library. It includes the QueryClient, the QueryCache, the Query and the QueryObserver.

### QueryClient

The QueryClient depends on the QueryCache. It provides methods to fetch data or invalidating the cache. For example, QueryClient calls Query to fetch data.

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

> What is the defaultOptions?

The default options for Query are used globally.

If you create the QueryClient below, the staleTime is set to `Infinity` by default.

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

The QueryCache caches Query in memory. It is based on a Map object, and queryKey is used as the key.

- key: The hashed value derived from the queryKey. The [hashKey](./tanstack-query-lite/core/util.js#L2) hash function uses JSON.stringify.
- value: Query.

> What method does QueryCache use to add a Query?

The `build` method. If a query is cached, the cached query object is returned to avoid creating a new instance.

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

Query manages server state. Server state management involves storing and fetching server state. Query also supports the observer pattern. It allows subscribers to receive events whenever the server state changes.

> How does the server state fetching logic work?

Query provides `fetch` method to fetch server state. It uses the queryFn of the Query. To avoid repeated requests, Query uses `promise` member variable. Here is a breakdown of how the promise works during the request.

- **Request Initiated**: A Promise object, created based on the queryFn function, is assigned to the promisee.
- **Request In Progress**: The value of the promise is returned (a new Promise object is not created).
- **Request Completed**: The promise is reset to null.

> How does staleTime work?

Query uses the `lastUpdated` member variable. Before the fetch method is executed, the value of `Date.now() - lastUpdated` is compared with staleTime. This comparison determines whether the fetch method should be executed.

```jsx
const diffUpdatedAt = Date.now() - lastUpdated;
const needsToFetch = diffUpdatedAt > staleTime;

if (needsToFetch) {
  query.fetch();
}
```

> How does gcTime work?

At the time of Query creation, garbage collection (GC) is managed via the `scheduleGcTimeout` method using [setTimeOut](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout). When the gcTime timeout is triggered, Query request to QueryCache to remove the object.

Each time a subscription occurs, the timeout is reset using the `clearGcTimeout`method. If a subscriber unsubscribes and the subscriber list becomes empty, the scheduleGcTimeout method is executed again.

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

QueryObserver is an object that subscribes to a Query. It depends directly on the Query with the queryKey. QueryObserver executes `notify` method whenever the state of the Query changes.

QueryObserver supports observer pattern such as Query. When a subscription occurs, it calls `fetch` method of the Query to fetch server state.

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

## Step 2: Integration with React

We want to re-render React Component whenever the state of Query changes. But Query is not React code. This means that even if the state of the Query changes, React will not trigger a re-render.

### Trigger re-render when the state of Query changes

React provides a custom hook [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) for subscribing to external state changes. It allows for re-rendering whenever the external state changes.

By using useSyncExternalStore with QueryObserver, you can subscribe to the latest state of a Query and trigger a re-render whenever the Query state changes. Here’s a simple code implementation.

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

The flow of re-rendering is below.

1. Create a QueryObserver
   - (1-1) Create a Query (skip this step if a cached Query already exists).
   - (1-2) Subscribe the QueryObserver to the Query. When subscribing, the notify member variable is assigned to onStoreChange from useSyncExternalStore.
   - (1-3) Request the fetch method from the Query (the fetch method may not execute if staleTime is not exceeded).
2. After the fetch function in the Query completes, the server state is updated.
3. The Query executes the notify function for all subscribed QueryObserver.
   - (3-1) onStoreChange from useSyncExternalStore is executed.
   - (3-2) The QueryObserver returns the latest state using the getResult function, triggering a re-render.

Let’s explore other ways to use the core logic in React.

### QueryClientProvider

The QueryClient is a globally accessible. Using Context, you can create a provider and custom hook to make the QueryClient globally accessible.

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

If you declare a QueryClientProvider on the top-level component, the QueryClient becomes globally accessible.

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

useQuery is a custom hook that manages server state using a QueryObserver.

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

### 1. Trigger refetch when the browser’s focus state changes

**Description**

Implement the refetchOnWindowFocus option.

**Requirements**

- [ ] Call the fetch method of the Query whenever the browser’s focus state changes.

**Code**

You can implement this by modifying the QueryCache and QueryClientProvider.

**_core/QueryCache.ts_**

- Execute the fetch function of all cached Query whenever the onFocus method is called.

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
- When the onFocus event occurs, the fetch method of all cached Query will be executed.

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

### 2. Creating a developer tool like ReactQueryDevtools

**Description**

Create a developer tool similar to [ReactQueryDevTools](https://tanstack.com/query/v5/docs/framework/react/devtools) from TanStack Query.

**Requirements**

- [ ] Display the status, staleTime, and gcTime information of all cached Query.
- [ ] Update the list of cached Query whenever changes occur.

**Code**

To detect changes in cached Query, implement the observer pattern in QueryCache.

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

The ReactQueryDevtools retrieves the list of cached Query from the QueryCache. Whenever server state changes, the tool updates the state of the Query list and triggers a re-render.

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

Render the ReactQueryDevtools on the top-level component to see the developer tools in action.

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
