# React 영역

React에서 코어 영역의 코드를 사용하는 방법을 알아봅니다.

## 목표

- React에서 코어 영역 코드를 사용하는 방법을 알아봅니다.
- 서버 상태가 변경될 때 리렌더링을 발생시키는 방법을 알아봅니다.

## React에 코어 영역 적용하기

React에서 서버 상태를 사용하려면 코어 영역의 어떤 객체를 사용해야 할까요?

`Query` 객체와 `QueryObserver` 객체입니다. React에서 서버 상태를 사용하는 절차를 살펴봅시다.

1. 컴포넌트 생성 시점에 `QueryObserver`를 생성한다.
2. `Query`를 생성하여 서버 상태를 조회한다.
3. 서버 상태가 변경될 때 마다 리렌더링이 발생시킨다.

React에서는 `Query`가 관리하는 서버 상태가 변경될 때 마다 리렌더링을 발생시켜 UI를 변경시켜야 합니다. 하지만 아쉽게도 코어 영역의 코드는 React로 작성된 코드가 아닙니다. 그래서 `Query`의 상태가 변경되더라도 리렌더링이 발생하지 않습니다.

이제 `Query`의 상태가 변경될 때 리렌더링이 발생시키는 방법을 알아봅시다. 앞으로 React에서 코어 영역을 사용하는 커스텀 Hook을 `useQuery`라고 부르겠습니다.

`useQuery`는 `Query`의 **서버 상태가 변경될 때 리렌더링을 발생**시켜야 합니다. 아래 두 가지 요구사항을 기반으로 `useQuery`를 구현해 봅시다.

- `useQuery`는 `Query`의 서버 상태 변경을 감지할 수 있다.
- `useQuery`는 `Query`의 서버 상태가 변경될 때 리렌더링을 발생시킨다.

## 서버 상태 변경 감지

**서버 상태 변경 감지**는 `QueryObserver`를 생성 후 `Query`를 구독하여 해결할 수 있습니다.

`QueryObserver`는 생성 시점에 `QueryClient`를 인자로 받습니다. 그래서 `useQuery`에서 `QueryClient`를 접근이 필요합니다.

React의 Context API를 이용하여 `QueryClient`를 전역으로 접근할 수 있는 커스텀 Hook을 작성해 봅시다.

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

이제 다음과 같이 최상위 컴포넌트에서 `QueryClientProvider`를 선언하면 자식 컴포넌트에서 `QueryClient`를 접근할 수 있습니다.

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

## 리렌더링 발생시키기

React는 18 버전부터 외부 상태를 구독할 수 있는 [useSyncExternalStore](https://ko.react.dev/reference/react/useSyncExternalStore) 커스텀 Hook을 제공하고 있습니다.

`useSyncExternalStore`을 통해 외부 상태 변경을 구독할 수 있으며, 상태 값이 변경될 때 마다 리렌더링을 발생시킬 수 있습니다.

`useQuery`에 코어 영역의 코드와 `useSyncExternalStore`를 사용해 정리해 보면 다음과 같습니다.

```jsx
import { useCallback, useState, useSyncExternalStore } from "react";
import QueryObserver from "../core/QueryObserver";
import { useQueryClient } from "./QueryClientProvider";

const useBaseQuery = (options, Observer, queryClient) => {
  const client = useQueryClient(queryClient);

  const [observer] = useState(() => {
    const defaultOptions = client.defaultQueryOptions(options);
    return new Observer(client, defaultOptions);
  });

  const subscribe = useCallback(
    (onStoreChange) => {
      const unsubscribe = observer.subscribe(onStoreChange);
      return unsubscribe;
    },
    [observer]
  );

  const getSnapshot = useCallback(() => {
    return observer.getResult();
  }, [observer]);

  useSyncExternalStore(subscribe, getSnapshot);

  return observer.getResult();
};

const useQuery = (options, queryClient) => {
  return useBaseQuery(options, QueryObserver, queryClient);
};

export default useQuery;
```

## 정리

`useQuery`의 동작 흐름을 정리해 보면 다음과 같습니다.

1. `QueryObserver`를 생성합니다.

   - `QueryObserver`를 생성합니다.
   - `queryKey` 기반으로 `Query`를 생성 후 구독합니다.
   - 서버 상태 조회를 위해 `Query`에게 `fetch` 메소드를 요청합니다.

2. `useSyncExternalStore`을 호출합니다.

   - `subscribe`: `QueryObserver`에 구독하여 Query의 상태가 변경될 때 `onStoreChange` 함수가 실행됩니다.
   - `getSnapshot`: `QueryObserver`의 `getResult` 메소드를 통해 서버 상태를 반환합니다.

3. 서버 상태가 변경될 때 마다 리렌더링이 발생됩니다.

## 동작 검증하기

마지막으로 `useQuery`의 동작을 검증해 봅시다.

```js
const usePostListQuery = () => {
  return useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data } = await axios.get("https://jsonplaceholder.typicode.com/posts");

      return data.slice(0, 5);
    }
  });
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1_000,
      gcTime: 1_000 * 60
    }
  }
});

const PostList = () => {
  const { data: postListData } = usePostListQuery();

  if (!postListData) {
    return <div>loading...</div>;
  }

  return (
    <ul>
      {postListData.map((post) => {
        const { id, title } = post;

        return <li key={id}>{title}</li>;
      })}
    </ul>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <PostList />
    </QueryClientProvider>
  );
};
```

정상 동작은 아래 영상을 참고해 주세요.

<video width="100%" height="240" controls>
  <source src="/demo.mov" type="video/mp4">
</video>
