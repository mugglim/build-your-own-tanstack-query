# React 영역

React에서 코어 영역의 코드를 사용하는 방법을 알아봅시다.

우리가 React에서 TanStack Query를 사용하는 경우 두 가지 기능을 기대합니다.

- 서버 상태를 조회할 수 있다.
- 서버 상태가 변경될 때 리렌더링이 발생한다.

위 요구사항을 만족하는 `useQuery` 커스텀훅을 구현해 봅시다.

## Step1. QueryClient 공유하기

`QueryClient`는 전역에서 접근이 가능한 객체입니다. Context API를 이용하여 전역으로 `QueryClient`를 공유하는 커스텀 Hook을 작성해 봅시다.

```jsx
export const QueryClientContext = createContext(null);

export const QueryClientProvider = ({ client, children }) => {
  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
};

export const useQueryClient = () => {
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

const App = ({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
```

## Step2: 서버 상태 조회하기

React에서 서버 상태를 조회하려면 코어 영역의 어떤 객체를 사용해야 할까요?

`QueryObserver`입니다. `QueryObserver`를 사용하면 `Query`를 생성 및 구독하여 서버 상태를 조회할 수 있고, `Query`의 상태가 변경될 떄마다 이벤트도 전달받습니다.

`useState`를 통해 `QueryObserver`를 생성해 봅시다.

```jsx
const useBaseQuery = (options, Observer, queryClient) => {
  const client = useQueryClient(queryClient);

  const [observer] = useState(() => {
    const defaultOptions = client.defaultQueryOptions(options);

    return new Observer(client, defaultOptions);
  });

  return observer.getResult();
};
```

이제 서버 상태를 조회하고 상태가 변경될 떄마다 이벤트를 전달받을 수 있습니다. 하지만 리렌더링은 발생하지 않습니다. 코어 영역의 코드는 React로 작성된 코드가 아닙니다. 그래서 `Query`의 상태가 변경되더라도 리렌더링이 발생하지 않습니다.

## Step3: 리렌더링 발생시키기

React는 18 버전부터 외부 상태를 구독할 수 있는 [useSyncExternalStore](https://ko.react.dev/reference/react/useSyncExternalStore) 커스텀 Hook을 제공하고 있습니다.

`useSyncExternalStore`을 통해 외부 상태 변경을 구독할 수 있으며, 상태 값이 변경될 때마다 리렌더링을 발생시킬 수 있습니다.

`useQuery`에 코어 영역의 코드와 `useSyncExternalStore`를 사용해 정리해 보면 다음과 같습니다.

```jsx
import { useCallback, useState, useSyncExternalStore } from "react";
import QueryObserver from "../core/QueryObserver";
import { useQueryClient } from "./QueryClientProvider";

const useBaseQuery = (options, Observer, queryClient) => {
  ...

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

## Step4: 동작 검증하기

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
