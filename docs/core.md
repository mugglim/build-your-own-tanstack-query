# 코어 영역

core 로직은 외부 환경에 의존되지 않는 코드입니다. 코드는 QueryClient, QueryCache, Query, QueryObserver 4가지 객체로 구성되어 있습니다.

## QueryClient

QueryClient는 QueryCache를 의존하며, 데이터 패칭 및 캐시 무효화와 같은 기능을 제공합니다. 예를 들어 데이터 패칭은 Query에 구현되어 있습니다.

### defaultOptions 값은 무엇인가요?

Query의 기본 옵션을 전역으로 설정하는 값 입니다.

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

아래와 같이 QueryClient를 생성하면, Query의 기본 staleTime 값은 Infinity입니다.

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

QueryCache는 메모리에 Query를 캐싱하는 역할을 담당합니다. Map 객체 기반으로 구현되어 있으며, queryKey 값을 해싱하여 key로 활용합니다.

- **key**: Query의 queryKey 값을 기반으로 해싱된 값을 사용합니다. 해싱함수는 JSON.stringify 기반의 [hashKey](./tanstack-query-lite/core/util.js#L2) 함수를 사용합니다.
- **value**: Query

### QueryCache 어떤 메소드로 Query를 추가하나요?

build 메소드를 기반으로 Query를 추가합니다. 만약 queryKey 값에 해당하는 Query가 이미 존재한다면, 캐싱되어 있는 Query를 반환하여 불필요한 Query 객체의 인스턴스 생성을 방지합니다.

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

## Query

Query는 서버 상태를 관리합니다. 서버 상태 관리는 서버 상태를 저장하고, 서버 상태를 조회하는 역할을 의미합니다. 옵저버 패턴으로 구독을 허용하고 있으며, 서버 상태가 변경될 때 구독자들에게 이벤트를 발행합니다.

### 서버 상태 조회 로직은 어떻게 동작하나요?

fetch 메소드를 제공하여 서버 상태를 조회합니다. 서버 상태 조회 로직은 Query 생성 시점에 전달되는 queryFn 함수를 사용합니다. fetch 메소드가 호출될 때 마다 서버 상태 요청이 발생하지 않도록, Promise 객체를 promise 멤버 변수로 관리합니다. 요청의 상태에 promise 멤버 변수를 상태를 정리해 봅시다.

- 요청 발생: queryFn 함수 기반으로 생성된 Promise 객체를 promise 멤버 변수에 할당합니다.
- 요청 중: promise 멤버 변수의 값을 반환합니다. (Promise 객체를 새롭게 생성하지 않습니다.)
- 요청 완료: promise 멤버 변수를 null로 초기화합니다.

### staleTime은 어떻게 동작하나요?

서버 상태가 마지막으로 변경된 시점을 timestamp 기반의 lastUpdated 멤버 변수로 저장하고 있습니다. fetch 메소드가 실행되기 전 `Date.now() - lastUpdated` 값과 staleTime를 비교하여, fetch 메소드 실행 여부를 판단합니다.

```jsx
const diffUpdatedAt = Date.now() - lastUpdated;
const needsToFetch = diffUpdatedAt > staleTime;

if (needsToFetch) {
  query.fetch();
}
```

### gcTime은 어떻게 동작하나요?

Query가 생성되는 시점에 [setTimeout](https://developer.mozilla.org/ko/docs/Web/API/Window/setTimeout)를 사용하여 scheduleGcTimeout 메소드를 통해 gc를 관리합니다. gcTime timeout이 호출되면 QueryCache에게 제거를 요청합니다.

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

QueryObserver는 Query 구독합니다. queryKey 값을 기반으로 Query를 직접적으로 의존할 수 있으며, Query의 상태가 변경될 때 마다 이벤트를 발행받아 notify 메소드를 실행시킵니다.

QueryObserver는 Query와 동일하게 옵저버 패턴을 기반으로 구독을 허용하고 있습니다. 구독이 발생할 때 Query의 fetch 메소드를 실행하여 최신 서버 상태를 조회하도록 요청합니다.

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
