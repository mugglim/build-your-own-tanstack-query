# Window Focus Refetching

## 설명

브라우저의 focus 상태가 변경될 때 상태를 다시 조회하는 로직을 구현해봅시다.

## 요구사항

- 브라우저의 focus 상태가 변경될 때 Query의 `fetch` 메소드가 호출됩니다.

## 해결방안

### QueryCache

QueryCache는 Query 목록을 관리하고 있습니다. 다음과 같이 Query 목록을 조회 후 `fetch` 발생시키는 `onFocus` 메소드를 구현해봅시다.

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

### QueryClientProvider

focus 상태 변경에 대한 감지는 document 객체의 [visibilitychange](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event) 이벤트를 기반으로 감지할 수 있습니다.

`visibilitychange` 이벤트가 발생할 때 `document.visibilityState !== hidden` 인 경우, 브라우저의 focus가 다시 활성화된 상태로 판단할 수 있습니다. 브랑줘의 focus가 다시 활성화 된 경우, QueryCache의 `focus` 메소드를 호출하여 활성화 된 Query들에게 fetch를 발생시킬 수 있다.

```jsx
export const QueryClientProvider = ({ children, client }) => {
  useEffect(() => {
    const cache = client.getQueryCache();

    const onFocus = () => {
      const isFocused = document.visibilityState !== "hidden";

      if (isFocused) {
        cache.onFocus();
      }
    };

    window.addEventListener("visibilitychange", onFocus, false);

    return () => {
      window.removeEventListener("visibilitychange", onFocus, false);
    };
  }, [client]);

  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
};
```
