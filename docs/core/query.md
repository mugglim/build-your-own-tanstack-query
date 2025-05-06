# Query

`Query`는 서버 상태를 관리합니다.

구독 기능을 제공하며 서버 상태를 조회 후, 변경될 때 마다 구독자들에게 새로운 상태를 전달합니다.

## 인터페이스

### 멤버 변수

- `cache`: `QueryCache`
- `queryKey`: `Query` 식별을 위한 고유한 값
- `queryHash`: `queryKey`를 해싱한 값
- `options`: `Query` 옵션 값 (예) `queryKey`, `queryFn`, `staleTime`, `gcTime`)
- `observers`: `Query`에 구독하고 있는 구독자 목록
- `state`: 내부적으로 관리하는 서버 상태
- `promise`: 서버 상태 요청을 처리하기 위한 Promise 객체
- `gcTimeout`: `QueryCache`에게 캐싱 제거를 요청하는 timeout

### 메소드

- `fetch:` 서버 상태를 요청
- `setState`: 내부적으로 관리하고 있는 서버 상태를 변경
- `scheduleGcTimeout`: `QueryCache`에게 캐싱 제거를 요청하는 timeout
- `clearGcTimeout`: `scheduleGcTimeout` timeout을 제거
- `subscribe`: 구독자 추가 (서버 상태가 변경될 때 이벤트 전달)

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

## 설명

### 서버 상태는 어떻게 관리되나요?

서버 상태 관리는 조회와 변경으로 구분할 수 있습니다.

**서버 상태 조회**는 `fetch` 메소드 사용하며 `Query` 생성 시점에 전달되는 `queryFn` 함수를 사용합니다.
`Query`는 동일한 요청이 중복으로 발생하는 현상을 방지하기 위해, 서버 상태 요청을 담당하는 Promise 객체를 내부 변수 `promise`로 관리합니다.

`promise` 값 상태에 따른 `fetch` 메소드 동작을 정리하면 다음과 같습니다.

| `promise` 값 할당 여부 |                              `fetch` 내부 동작                               |
| :--------------------: | :--------------------------------------------------------------------------: |
|        `false`         | `queryFn` 함수 기반으로 Promise 객체를 생성하여 `promise` 변수에 할당합니다. |
|         `true`         |    `promise` 값을 반환합니다. (Promise 객체를 새롭게 생성하지 않습니다.)     |

**서버 상태 변경**은 `setState` 메소드를 사용합니다. `Query`는 상태가 변경될 때 마다 구독자들에게 상태 변경 이벤트를 전달합니다.

### `gcTime`은 무엇인가요?

`gcTime`은 `QueryCache`에서 캐싱되어 있는 `Query`를 제거하지 않는 시간을 의미합니다.

`Query`가 생성되는 시점에 [setTimeout](https://developer.mozilla.org/ko/docs/Web/API/Window/setTimeout)를 사용하여 `scheduleGcTimeout` 메소드를 통해 관리합니다. `gcTime` timeout이 호출되면 QueryCache에게 제거를 요청합니다.

단, `Query`에 구독이 발생될 때 마다 `clearGcTimeout` 메소드를 사용하여 `gcTime` timeout이 초기화됩니다. 만약 구독이 해제될 때 구독된 구독자가 없다면 `scheduleGcTimeout`을 통해 `gcTime` timeout이 다시 할당됩니다.
