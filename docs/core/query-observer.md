# QueryObserver

`QueryObserver`는 `Query`를 구독하는 객체입니다.

`queryKey` 값을 기반으로 구독할 `Query` 객체를 결정하며 `Query`의 상태가 변경될 때 마다 새로운 상태를 전달받습니다.

`QueryObserver`는 `Query`와 동일하게 구독을 허용하고 있습니다. 구독이 발생하는 시점에 `Query`에게 최신 서버 상태를 조회하도록 요청합니다.

## 인터페이스

### 멤버 변수

- `client`: `QueryClient`
- `options`: `QueryObserver` 옵션 값 (예) `queryKey`, `queryFn`, `staleTime`, `gcTime`)
- `notify`: `Query`의 서버 상태가 변경될 때 호출되는 콜백 함수

### 메소드

- `getQuery`: 구독 중인 `Query`를 반환
- `getResult`: 구독 중인 `Query`의 상태를 반환
- `subscribe`: 구독자 추가 (구독 시점에 콜백함수 전달)

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

## 설명

### `staleTime`은 무엇인가요?

`staleTime`은 서버 상태를 fresh 상태에서 stale 상태로 변경되는 시간을 의미합니다.

`Query`는 서버 상태가 마지막으로 변경된 시점을 `lastUpdated` 변수로 저장합니다. `QueryObserver`는 `Query`의 `lastUpdated` 값을 활용하여 `fetch` 메소드가 실행되기 전 `Date.now() - lastUpdated` 값이 `staleTime` 보다 큰 경우에만 `fetch` 메소드를 실행시킵니다.

`Date.now() - lastUpdated` > `staleTime` 값 상태에 따른 `fetch` 메소드 동작을 정리하면 다음과 같습니다.

| `Date.now() - lastUpdated` > `staleTime` | `fetch` 실행 여부 |
| :--------------------------------------: | :---------------: |
|                 `false`                  |      `false`      |
|                 `true `                  |      `true`       |

> [!TIP] fresh/stale 한 상태가 무엇인가요?
>
> - **fresh 상태**
>   - 최신 서버 상태를 의미합니다.
>   - 서버 상태를 재요청하지 않고 캐싱되어 있는 상태를 사용합니다.
> - **stale 상태**
>   - 최신 서버 상태가 아닌 상황을 의미합니다.
>   - 최신 서버 상태 요청이 필요합니다.
>     - (참고) `Date.now() - lastUpdated` 값이 `staleTime` 보다 큰 경우 stale 상태라고 판단합니다.
