# React에 적용하기

React에서 TanStack Query를 사용하기 위해서는 Query의 상태가 변경될 때 마다 리렌더링을 발생시켜 UI를 변경시켜야 합니다. 아쉽게도 코어 영역의 코드는 React로 작성된 코드가 아니기에 Query의 상태가 변경되더라도 리렌더링이 발생하지 않습니다.

React에 TanStack Query를 사용을 위한 요구사항은 2가지로 정리해볼 수 있습니다.

1. Query의 상태가 변경될 때 감지할 수 있어야 한다.
2. Query의 상태가 변경될 때 리렌더링이 발생해야 한다.

위 요구사항을 해결하는 `useQuery`로 커스텀 Hook을 구현해봅시다!

## 상태 변경 감지와 리렌더링

### 상태 변경 감지

상태 변경 감지는 QueryObserver 생성하여 Query를 구독하여 해결할 수 있습니다.

```ts
const useQuery = () => {
  const [queryObserver] = useState(() => new QueryObserver());

  // Query의 상태가 변경되도 리렌더링은 발생하지 않습니다.
  return queryObserver.getResult();
};
```

### 리렌더링 발생

React는 18 버전부터 외부 상태를 구독할 수 있는 [useSyncExternalStore](https://ko.react.dev/reference/react/useSyncExternalStore) 커스텀 Hook을 제공하고 있습니다. `useSyncExternalStore`을 통해 외부 상태 변경을 구독할 수 있으며, 상태 값이 변경될 때 마다 리렌더링을 발생시킬 수 있습니다.

코드로 구현해보면 다음과 같습니다.

```jsx
const useQuery = () => {
  const [queryObserver] = useState(() => new QueryObserver());

  useSyncExternalStore(
    useCallback((onStoreChange) => {
      // Query 객체를 생성하고, Query 객체의 상태가 변경될 때 onStoreChange 함수를 호출한다.
      const unsubscribe = queryObserver.subscribe(onStoreChange);

      return unsubscribe;
    }, []),
    // onStoreChange 함수가 호출될 때 Object.is로 이전 값과 최신 값을 비교하여, 다시 렌더링을 발생시킨다.
    () => queryObserver.getResult()
  );

  return queryObserver.getResult();
};
```

### 정리

`useQuery`의 동작 흐름을 정리해보면 다음과 같습니다.

1. QueryObserver를 생성합니다.
2. `queryKey` 기반으로 Query를 생성 후 구독합니다.

   - 캐시된 Query가 있는 경우 생성 과정은 생략합니다.

3. 서버 상태 조회를 위해 Query에게 `fetch` 메소드를 요청합니다.

   - `staleTime`에 따라서 fetch 메소드가 실행되지 않을 수 있습니다.

4. `useSyncExternalStore`을 호출합니다.

   - `subscribe`: QueryObserver에 구독하여 Query의 상태가 변경될 때 `onStoreChange` 함수가 실행됩니다.
   - `getSnapshot`: `Query.getResult`를 통해 Query의 상태를 반환합니다.

5. 서버 상태가 변경될 때 마다 리렌더링이 발생됩니다.

## QueryClientProvider

QueryClient는 전역으로 접근할 수 있습니다. Context를 이용하여 QueryClient를 전역으로 접근할 수 있도록 Provider와 커스텀 Hook을 작성해봅니다.

```jsx
export const QueryClientContext = createContext(null);

export const QueryClientProvider = ({ client, children }) => {
  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
};

export const useQueryClient = (queryClient) => {
  const client = useContext(QueryClientContext);

  if (queryClient) {
    return queryClient;
  }

  if (!client) {
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  }

  return client;
};
```

다음과 같이 최상위 컴포넌트에서 QueryClientProvider를 선언하면, 자식 컴포넌트에서 QueryClient를 접근할 수 있습니다.

```jsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1_000,
      gcTime: 1_000 * 60
    }
  }
});

// 최상위 컴포넌트
const App = ({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
```
