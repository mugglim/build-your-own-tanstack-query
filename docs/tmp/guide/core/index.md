# Core Layer

The core layer does not depend on any specific library. Let's learn how to implement the core logic of `QueryClient`, `QueryCache`, `Query`, and `QueryObserver` directly.

## Step 1: QueryClient

`QueryClient` is the most important object in the core layer. It provides many features of TanStack Query through the `QueryClient`. Therefore, `QueryClient` often allows global access. Usually, you create a `QueryClient` instance at the start of the application and share it. In React environments, you share the `QueryClient` instance between components using the `useContext` API.

```javascript
import QueryCache from "./QueryCache";
import { hashKey } from "./utils";

class QueryClient {
  cache;
  defaultOptions;

  constructor(config) {
    this.cache = config.cache || new QueryCache();
    this.defaultOptions = config.defaultOptions;
  }

  getQueryCache = () => {
    return this.cache;
  };

  defaultQueryOptions = (options) => {
    // `options`가 전달되는 경우 `defaultOptions`와 병합하는 과정을 진행합니다.
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

`QueryClient` manages the global option values of `Query` objects through `defaultQueryOptions`. You can pass the `defaultQueryOptions` value when creating the `QueryClient` instance. This option allows you to avoid duplicating code when creating `Query` objects.

However, `QueryClient` does not implement many functions directly. It relies on the `QueryCache` object and delegates most feature implementations externally.

### What values can you specify in defaultOptions?

You can globally specify option values provided by `Query` such as `staleTime`, `gcTime`, etc.

For example, by specifying `defaultOptions` as below, you assign the default `staleTime` of `Query` to `Infinity`.

````javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity }
  }
});
```

```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity }
  }
});
````

### When is QueryClient usually created?

Create it at the application startup. After creating the `QueryClient` instance, allow global access and share the instance.

> [!TIP] React QueryClientProvider
>
> - In React, use [QueryClientProvider](https://tanstack.com/query/latest/docs/framework/react/reference/QueryClientProvider) to allow global access.

### What is the hashKey function?

It serializes the `queryKey` value of `Query`. Internally, it uses the `JSON.stringify()` method.

```javascript
export function hashKey(queryKey) {
  return JSON.stringify(queryKey);
}
```

## Step2: QueryCache

TanStack Query provides data caching functionality. `QueryCache` implements caching by storing `Query` object instances in **browser memory**.

`QueryCache` manages data using a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) and offers lookup, deletion, and creation functions. The key-value structure is as follows:

- `key`: `queryHash` of the `Query`
- `value`: instance of the `Query` object

```javascript
import { Query } from "./Query";
import { hashKey } from "./util";

class QueryCache {
  queries;

  constructor() {
    this.queries = new Map();
  }

  get = (queryHash) => {
    return this.queries.get(queryHash);
  };

  getAll = () => {
    const queries = this.queries.values();

    return [...queries];
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

### How does caching work?

`QueryCache` stores cached data in memory using the `queries` variable.

The `queries` variable uses a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) with this key-value pair:

- `key`: `queryHash` of the `Query`
- `value`: instance of the `Query` object

> [!TIP] What is `queryHash`?
>
> - It is the hashed value of the `Query`'s `queryKey`.
> - Hashing uses the [hashKey](https://github.com/mugglim/build-your-own-tanstack-query/blob/main/tanstack-query-lite/core/util.js#L2) function.

### How to add cache to `QueryCache`?

Use the `build` method. If a `Query` already exists in `queries`, it returns the cached `Query` instance.

```javascript{8-22}
class QueryCache {
  ...

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

    // 캐싱되어 있는 Query를 반환합니다.
    return query;
  }
}
```

## Step3: Query

`Query` fetches and manages server state in TanStack Query.

`Query` tracks the fetch status (pending, success, error) and data as its state. It notifies subscribers whenever the state changes. Additionally, `Query` prevents duplicate fetch requests for the same data.

```javascript
export class Query {
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
      this.cache.notify();
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
      this.observers = this.observers.filter((d) => {
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

    this.cache.notify();
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

### How does server state management work?

Server state management divides into fetching and updating.

**Fetching server state** uses the `fetch` method and the `queryFn` function passed when creating the `Query`.  
To prevent duplicate requests, `Query` stores the Promise handling the request in an internal variable called `promise`.

| `promise` assigned? | `fetch` method behavior                                        |
| ------------------- | -------------------------------------------------------------- |
| `false`             | Create a new Promise via `queryFn` and assign it to `promise`. |
| `true`              | Return the existing `promise` to avoid duplicate requests.     |

**Updating server state** uses the `setState` method.  
`Query` notifies subscribers on every state change.

### What is `gcTime`?

`gcTime` defines how long `QueryCache` keeps a cached `Query` before removing it.

`Query` uses `setTimeout` at creation and manages this via `scheduleGcTimeout`.  
When the `gcTime` timeout fires, `QueryCache` removes the `Query`.

If any subscriber exists, `clearGcTimeout` cancels the timeout.  
When all subscribers unsubscribe, `scheduleGcTimeout` sets the timeout again.

## Step4: QueryObserver

`QueryObserver` optimizes subscriptions to `Query`.  
For example, it uses `staleTime` to prevent unnecessary `fetch` calls.

`QueryObserver` subscribes to a single `Query`.  
It selects the `Query` by `queryKey` and receives updated states whenever the `Query` state changes.

```javascript
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

### What is `staleTime`?

`staleTime` means the time interval after which the server state changes from fresh to stale.

`Query` saves the last time the server state changed in the `lastUpdated` variable.  
`QueryObserver` uses `lastUpdated` to decide whether to run `fetch`. It runs `fetch` only if `Date.now() - lastUpdated` is greater than `staleTime`.

| `Date.now() - lastUpdated` > `staleTime` | Should `fetch` run? |
| :--------------------------------------: | :-----------------: |
|                 `false`                  |       `false`       |
|                  `true`                  |       `true`        |

> [!TIP] What do fresh and stale states mean?
>
> - **Fresh state**
>   - The data is up-to-date.
>   - Use cached data without requesting the server again.
> - **Stale state**
>   - The data is outdated.
>   - The server request is necessary.
>     - (Note) When `Date.now() - lastUpdated` is greater than `staleTime`, the state is stale.
