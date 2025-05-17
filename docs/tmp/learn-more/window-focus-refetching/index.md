# Window Focus Refetching

## Explanation

Let's implement logic to refetch the state when the browser's focus changes.

## Requirements

- Call the `fetch` method of each Query when the browser's focus state changes.

## Solution

### QueryCache

`QueryCache` manages the list of Queries. Implement an `onFocus` method that fetches each Query by iterating over the cached Queries as follows.

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

We can detect focus state changes using the `visibilitychange` event on the `document` object.

When the `visibilitychange` event fires, if `document.visibilityState !== 'hidden'`, it means the browser has regained focus. In this case, call the `focus` method of `QueryCache` to trigger `fetch` on active Queries.

```jsx
export const QueryClientProvider = ({ children, client }) => {
  useEffect(() => {
    const cache = client.getQueryCache();

    const onFocus = () => {
      const isFocused = document.visibilityState !== "hidden";

      if (isFocused) {
        const cache.

         const queries = cache.getAll();

        queries.forEach((query) => {
          query.fetch();
        });
      }
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
