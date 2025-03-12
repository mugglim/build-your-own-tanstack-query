# refetchOnWindowFocus

브라우저의 focus 상태가 변경될 때 상태를 다시 조회하는 로직을 구현해봅시다.

## 설명

refetchOnWindowFocus와 비슷한 기능을 구현해봅니다.

## 요구사항

- [ ] 브라우저의 focus 상태가 변경될 때 Query의 fetch 메소드를 호출합니다.

## 코드

QueryCache와 QueryClientProvider 컴포넌트 로직을 일부 수정하면 해결할 수 있습니다.

**_core/QueryCache.ts_**

- onFocus 메소드가 호출될 때, 캐싱되어 있는 모든 Query의 fetch 함수를 실행합니다.

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
- cache.onFocus 이벤트가 발생하면 캐싱되어 있는 모든 Query의 fetch 메소드가 호출됩니다.

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
      window.removeEventListener("visibilitychange", onFocus, false);
      window.removeEventListener("focus", onFocus, false);
    };
  }, [client]);

  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
};
```
