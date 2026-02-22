# Window Focus Refetching

## Overview

Let's implement refetching when the browser regains focus.

## Requirements

- Call the `fetch` method of each Query when the browser's focus state changes.

## Solution

### QueryCache

`QueryCache` manages the list of Queries. Implement an `onFocus` method that iterates over all cached Queries and calls `fetch` on each.

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

We can detect focus changes using the `visibilitychange` event.

When the `visibilitychange` event fires, if `document.visibilityState !== 'hidden'`, it means the browser has regained focus. In this case, call the `onFocus` method of `QueryCache` to trigger `fetch` on all cached Queries.

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
    window.addEventListener("focus", onFocus, false);

    return () => {
      window.removeEventListener("visibilitychange", onFocus, false);
      window.removeEventListener("focus", onFocus, false);
    };
  }, [client]);

  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
};
```
