# 코어 영역

코어 영역은 외부 환경에 의존되지 않는 코드입니다. QueryClient, QueryCache, Query, QueryObserver로 구성되어 있습니다.

## QueryClient

QueryClient는 TanStack Query의 전체적인 기능을 제공하는 객체입니다. Query의 기본 옵션 값을 전역으로 관리하며, QueryCache를 의존하여 Query를 접근할 수 있습니다.

### `defaultOptions` 값은 무엇인가요?

Query의 기본 옵션을 전역으로 설정하는 값 입니다. Query 생성 시점에 별도로 옵션을 지정하지 않더라도 QueryClient의 `defaultOptions` 값이 할당됩니다.

```jsx
class QueryClient {
  cache;

  constructor(config) {
    this.cache = config.cache || new QueryCache();
    this.defaultOptions = config.defaultOptions;
  }

  // `options`가 전달되는 경우 `defaultOptions`와 병합하는 과정을 진행
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

다음과 같이 QueryClient를 생성하는 시점에 `defaultOptions`을 할당하면, Query의 기본 staleTime 값은 `Infinity`로 할당됩니다.

```jsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity
    }
  }
});
```

## QueryCache

QueryCache는 메모리에 Query를 캐싱하는 역할을 담당하는 객체입니다.

QueryCache는 `queries` 변수는 통해 Query를 캐싱합니다. `queries`는 [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) 기반으로 구현되어 있으며, queryKey 값을 key로 활용합니다.

`queries`의 key, value 값을 정리하면 다음과 같습니다.

- `key`: Query의 queryKey를 해싱하여 사용합니다. 해싱은 [hashKey](https://github.com/mugglim/build-your-own-tanstack-query/blob/main/tanstack-query-lite/core/util.js#L2) 함수를 사용합니다.
- `value`: Query 객체

### QueryCache는 어떻게 Query 추가하나요?

`build` 메소드를 사용합니다. 만약 `queries`에 Query가 이미 존재한다면 캐싱되어 있는 Query를 반환하여 불필요한 Query 객체의 인스턴스 생성을 방지합니다.

```jsx
class QueryCache {
  queries;

  constructor() {
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

    // 캐싱되어 있는 Query를 반환합니다.
    return query;
  }
}
```

## Query

Query는 서버 상태를 조회하고 관리하는 객체입니다. Query 객체는 구독 기능을 제공하며, 서버 상태가 변경될 때 마다 구독자들에게 새로운 서버 상태를 전달합니다.

### 서버 상태 조회 로직은 어떻게 동작하나요?

`fetch` 메소드 사용하여 서버 상태를 조회합니다. `fetch` 메소드는 내부적으로 Query 생성 시점에 전달되는 `queryFn` 함수를 사용합니다. Query는 동일한 요청이 중복으로 발생하는 현상을 방지하기 위해 `fetch` 요청에 대한 promise를 내부 변수로 관리합니다. `promise` 값 상태에 따른 `fetch` 함수의 동작은 다음과 같습니다.

| `promise` 값 할당 여부 |                              `fetch` 내부 동작                               |
| :--------------------: | :--------------------------------------------------------------------------: |
|        `false`         | `queryFn` 함수 기반으로 Promise 객체를 생성하여 `promise` 변수에 할당합니다. |
|         `true`         |    `promise` 값을 반환합니다. (Promise 객체를 새롭게 생성하지 않습니다.)     |

### `staleTime`은 어떻게 동작하나요?

Query는 서버 상태가 마지막으로 변경된 시점을 `lastUpdated` 변수로 저장하고 있습니다. fetch 메소드가 실행되기 전 `Date.now() - lastUpdated` 값이 `staleTime` 보다 큰 경우에만 `fetch` 메소드를 실행시킵니다.

| `Date.now() - lastUpdated` > `staleTime` | `fetch` 실행 여부 |
| :--------------------------------------: | :---------------: |
|                 `false`                  |      `false`      |
|                 `true `                  |      `true`       |

```jsx
const diffUpdatedAt = Date.now() - lastUpdated;
const needsToFetch = diffUpdatedAt > staleTime;

if (needsToFetch) {
  query.fetch();
}
```

### `gcTime`은 어떻게 동작하나요?

Query가 생성되는 시점에 [setTimeout](https://developer.mozilla.org/ko/docs/Web/API/Window/setTimeout)를 사용하여 `scheduleGcTimeout` 메소드를 통해 gc를 관리합니다. `gcTime` timeout이 호출되면 QueryCache에게 제거를 요청합니다.

단, Query에 구독이 발생될 때 마다 `clearGcTimeout` 메소드를 사용하여 `gcTime` timeout이 초기화됩니다. 만약 구독이 해제될 때 구독자의 개수가 0이라면 `scheduleGcTimeout`을 통해 `gcTime` timeout이 할당됩니다.

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
      this.observers = this.observers.filter((d) => {
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

## QueryObserver

QueryObserver는 Query를 구독하는 객체입니다. `queryKey` 값을 기반으로 구독할 Query 객체를 결정하며, Query의 상태가 변경될 때 마다 새로운 상태를 전달받습니다.

QueryObserver는 Query와 동일하게 구독을 허용하고 있습니다. 구독이 발생하는 시점에 Query에게 최신 서버 상태를 조회하도록 요청합니다.

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
