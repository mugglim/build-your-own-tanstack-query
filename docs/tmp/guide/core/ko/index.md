# 코어 영역

코어 영역은 특정 라이브러리를 의존하지 않습니다. 코어 영역의 핵심 로직인 `QueryClient`, `QueryCache`, `Query`, `QueryObserver`를 직접 구현하는 방법을 알아봅시다.

## Step1: QueryClient

`QueryClient`는 코어 영역에서 가장 중요한 객체라고 말할 수 있습니다. TanStack Query에서 제공하는 많은 기능들을 `QueryClient`를 통해 제공하기 때문입니다. 그래서 `QueryClient`는 전역에서 접근을 허용하는 경우가 많습니다. 주로 애플리케이션 시작 시점에 `QueryClient` 인스턴스를 생성하여 공유합니다. React 환경에서는 `useContext` API를 통해 컴포넌트 간 `QueryClient` 인스턴스를 공유합니다.

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

`QueryClient`는 `Query` 객체의 전역 옵션값을 관리하는 `defaultQueryOptions`로 관리합니다. `defaultQueryOptions` 값은 `QueryClient` 인스턴스를 생성하는 시점에 전달할 수 있습니다. `defaultQueryOptions` 옵션을 통해 `Query` 객체를 생성할 때 중복되는 코드 영역을 선언하지 않아도 됩니다.

하지만 `QueryClient`는 많은 기능을 직접 구현하지는 않습니다. `QueryClient`는 `QueryCache` 객체를 의존하여 대부분의 기능 구현을 외부에 위임합니다.

### defaultOptions에는 어떤 값을 지정할 수 있나요?

`Query`에서 제공하는 옵션값(staleTime, gcTime, etc)을 전역으로 지정할 수 있습니다.

예를 들어 다음과 같이 `defaultOptions`을 지정하면 `Query`의 기본 `staleTime` 값을 `Infinity`로 할당합니다.

```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity }
  }
});
```

### QueryClient를 주로 언제 생성하나요?

애플리케이션 생성 시점에 생성합니다. `QueryClient`는 인스턴스를 생성 후 전역에서 접근을 허용하여 인스턴스를 공유하는 것을 권장합니다.

> [!TIP] React QueryClientProvider
>
> - React에서는 [QueryClientProvider](https://tanstack.com/query/latest/docs/framework/react/reference/QueryClientProvider)를 통해 전역으로 접근을 허용합니다.

### hashKey 함수는 무엇인가요?

`Query`의 queryKey 값을 직렬화하는 함수입니다. 내부적으로 `JSON.stringify()` 메소드를 사용합니다.

```javascript
export function hashKey(queryKey) {
  return JSON.stringify(queryKey);
}
```

## Step2: QueryCache

TanStack Query는 데이터를 캐싱하는 기능을 제공합니다. `QueryCache`는 `Query` 객체의 인스턴스를 **브라우저 메모리**에 저장하여 캐싱을 구현합니다.

`QueryCache`는 [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) 형태로 데이터를 관리하며 조회/삭제/생성 기능을 제공합니다. key-value의 형태를 정리하면 다음과 같습니다.

- `key`: `Query`의 `queryHash`
- `value`: `Query` 객체 인스턴스

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

### 캐싱은 어떻게 동작하나요?

`QueryCache`는 `queries` 변수를 사용해 메모리에 캐시 데이터를 저장합니다.

`queries` 변수는 [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) 사용합니다. key-value는 다음과 같습니다.

- `key`: `Query`의 `queryHash`
- `value`: `Query` 객체 인스턴스

> [!TIP] queryHash가 무엇인가요?
>
> - `Query`의 `queryKey`를 해싱한 값을 의미합니다.
> - 해싱은 [hashKey](https://github.com/mugglim/build-your-own-tanstack-query/blob/main/tanstack-query-lite/core/util.js#L2) 함수를 사용합니다.

### `QueryCache`에 어떻게 캐시를 추가하나요?

`build` 메소드를 사용합니다. 만약 `queries`에 `Query`가 캐싱되어 있는 경우, 캐싱된 `Query` 인스턴스를 반환합니다.

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

`Query`는 TanStack Query에서 서버 상태를 조회하고 관리합니다.

`Query`는 서버 상태를 조회할 때 조회 현황(대기, 성공, 실패)과 데이터를 상태로 관리합니다. 상태가 변경될 때마다 구독자들에게 변경 사항을 전달합니다. 추가로 `Query`는 서버 상태를 조회할 때 중복 조회를 방지합니다.

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

### 서버 상태는 어떻게 관리되나요?

서버 상태 관리는 조회와 변경으로 구분할 수 있습니다.

**서버 상태 조회**는 `fetch` 메소드 사용하며 `Query` 생성 시점에 전달되는 `queryFn` 함수를 사용합니다.
`Query`는 동일한 요청이 중복으로 발생하는 현상을 방지하기 위해, 서버 상태 요청을 담당하는 Promise 객체를 내부 변수 `promise`로 관리합니다.

`promise` 값 상태에 따른 `fetch` 메소드 동작을 정리하면 다음과 같습니다.

| `promise` 값 할당 여부 |                                      `fetch` 내부 동작                                      |
| :--------------------: | :-----------------------------------------------------------------------------------------: |
|        `false`         |        `queryFn` 함수 기반으로 Promise 객체를 생성하여 `promise` 변수에 할당합니다.         |
|         `true`         | `promise` 값을 반환합니다. Promise 객체를 새롭게 생성하지 않아 중복 요청 호출을 방지합니다. |

**서버 상태 변경**은 `setState` 메소드를 사용합니다. `Query`는 상태가 변경될 때마다 구독자들에게 상태 변경 이벤트를 전달합니다.

### `gcTime`은 무엇인가요?

`gcTime`은 `QueryCache`에서 캐싱되어 있는 `Query`를 제거하지 않는 시간을 의미합니다.

`Query`가 생성되는 시점에 [setTimeout](https://developer.mozilla.org/ko/docs/Web/API/Window/setTimeout)를 사용하여 `scheduleGcTimeout` 메소드를 통해 관리합니다. `gcTime` timeout이 호출되면 QueryCache에게 제거를 요청합니다.

단, `Query`에 구독이 발생될 때마다 `clearGcTimeout` 메소드를 사용하여 `gcTime` timeout이 초기화됩니다. 만약 구독이 해제될 때 구독된 구독자가 없다면 `scheduleGcTimeout`을 통해 `gcTime` timeout이 다시 할당됩니다.

## Step4: QueryObserver

`QueryObserver`는 `QueryObserver`는 `Query`의 최적화 용도로 사용됩니다. 예를 들어 `staleTime`을 활용하여 불필요한 `Query`의 `fetch` 호출을 방지합니다.

`QueryObserver`는 하나의 `Query`를 구독합니다. `queryKey` 값을 기반으로 구독할 `Query` 객체를 결정하며 `Query`의 상태가 변경될 때 마다 새로운 상태를 전달받습니다.

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

### `staleTime`은 무엇인가요?

`staleTime`은 서버 상태를 fresh 상태에서 stale 상태로 변경되는 시간을 의미합니다.

`Query`는 서버 상태가 마지막으로 변경된 시점을 `lastUpdated` 변수로 저장합니다. `QueryObserver`는 `Query`의 `lastUpdated` 값을 활용하여 `fetch` 메소드가 실행되기 전 `Date.now() - lastUpdated` 값이 `staleTime` 보다 큰 경우에만 `fetch` 메소드를 실행시킵니다.

`Date.now() - lastUpdated` > `staleTime` 값 상태에 따른 `fetch` 메소드 동작을 정리하면 다음과 같습니다.

| `Date.now() - lastUpdated` > `staleTime` | `fetch` 실행 여부 |
| :--------------------------------------: | :---------------: |
|                 `false`                  |      `false`      |
|                 `true `                  |      `true`       |

> [!TIP] fresh, stale 한 상태가 무엇인가요?
>
> - **fresh 상태**
>   - 최신 서버 상태를 의미합니다.
>   - 서버 상태를 재요청하지 않고 캐싱되어 있는 상태를 사용합니다.
> - **stale 상태**
>   - 최신 서버 상태가 아닌 상황을 의미합니다.
>   - 최신 서버 상태 요청이 필요합니다.
>     - (참고) `Date.now() - lastUpdated` 값이 `staleTime` 보다 큰 경우 stale 상태라고 판단합니다.
