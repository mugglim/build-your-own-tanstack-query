# React 적용하기

React에서 core 로직을 사용하는 경우, Query의 상태가 변경될 때 컴포넌트의 다시 렌더링을 발생시켜야 합니다. 아쉽게도 core 로직은 React로 작성된 코드가 아닙니다. Query의 상태가 변경되더라도 다시 렌더링이 발생하지는 않습니다.

## Query 상태가 변경될 떄 다시 렌더링을 발생시키기

React는 외부 상태를 구독할 수 있는 [useSyncExternalStore](https://ko.react.dev/reference/react/useSyncExternalStore) 커스텀 Hook을 제공하고 있습니다. 외부 상태 변경을 구독할 수 있으며, 상태 값이 변경될 때 마다 다시 렌더링이 발생됩니다.

QueryObserver를 useSyncExternalStore와 연동하면 Query의 최신 상태를 구독할 수 있고, Query 상태가 변경될 때 마다 다시 렌더링을 발생시킬 수 있습니다. 코드로 간단히 구현해보면 아래와 같습니다.

```jsx
const useQuery = () => {
  const [queryObserver] = useState(() => new QueryObserver());

  useSyncExternalStore(
    // subscribe
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

Query의 상태가 변경되고 다시 렌더링이 발생하는 흐름을 정리해 보면 아래와 같습니다.

1. QueryObserver를 생성합니다.
   - (1-1) Query를 생성합니다. (캐시된 Query 값이 있는 경우 생략합니다.)
   - (1-2) Query에 QueryObserver를 구독합니다. 구독할 때 notify 멤버 변수가 useSyncExternalStore의 onStoreChange로 할당됩니다.
   - (1-3) Query에게 fetch 메소드를 요청합니다. (staleTime에 따라서 fetch 메소드가 실행되지 않을 수 있습니다.)
2. Query에서 fetch 함수가 종료된 후 서버 상태를 변경합니다.
3. Query는 구독되어 있는 QueryObserver의 notify를 실행합니다.
   - (3-1) useSyncExternalStore의 onStoreChange가 실행합니다.
   - (3-2) QueryObserver는 getResult 함수를 통해 최신 상태를 반환하고 다시 렌더링을 발생시킵니다.

이제 core 로직을 React에서 활용할 수 있는 방법을 조금 더 알아보려고 합니다.

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

최상위 컴포넌트에서 QueryClientProvider를 선언하면, 전역에서 QueryClient를 접근할 수 있습니다.

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

## useQuery

useQuery는 QueryObserver를 이용하여 서버 상태를 관리하는 커스텀 Hook입니다.

QueryObserver 생성 및 useSyncExternalStore 처리 로직은 useBaseQuery에 작성되어 있습니다. useQuery는 단순히 useBaseQuery의 실행값을 반환합니다.

```jsx
const useBaseQuery = (options, Observer, queryClient) => {
  const client = useQueryClient(queryClient);

  const [observer] = useState(() => {
    const defaultOptions = client.defaultQueryOptions(options);
    return new Observer(client, defaultOptions);
  });

  const subscribe = useCallback(
    (onStoreChange) => {
      // Query 객체의 상태가 변경될 때 onStoreChange 메소드가 호출됩니다.
      const unsubscribe = observer.subscribe(onStoreChange);
      return unsubscribe;
    },
    [observer]
  );

  const getSnapshot = useCallback(() => {
    // Object.is 를 기반으로 다시 렌더링 여부를 판단합니다.
    return observer.getResult();
  }, [observer]);

  // core 로직과 React를 연결합니다.
  useSyncExternalStore(subscribe, getSnapshot);

  return observer.getResult();
};

const useQuery = (options, queryClient) => {
  return useBaseQuery(options, QueryObserver, queryClient);
};
```
