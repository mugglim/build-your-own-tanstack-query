# React Layer

Let's learn how to use the core layer code in React.

When we use TanStack Query in React, we expect two main features:

- Ability to fetch server state.
- Re-rendering when the server state changes.

Let's implement a custom hook `useQuery` that satisfies these requirements.

## Step 1. Sharing QueryClient

`QueryClient` is an object accessible globally.

Let's create a custom hook that shares `QueryClient` globally using React's Context API.

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

Now, if you declare `QueryClientProvider` in the top-level component like below, child components can access the `QueryClient` instance.

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

## Step2: Fetching Server State

Which core object should we use to fetch server state in React?

It’s the `QueryObserver`. Using `QueryObserver`, we create and subscribe to a `Query`, fetch the server state, and receive events whenever the `Query` state changes.

Let’s create a `QueryObserver` using `useState`.

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

Now you can fetch server state and receive events whenever the state changes. However, React won’t re-render automatically because the core code is not built with React. So, even if the `Query` state changes, no re-render happens.

## Step3: Triggering Re-render

Since React 18, React provides the [`useSyncExternalStore`](https://ko.react.dev/reference/react/useSyncExternalStore) hook to subscribe to external state.

Using `useSyncExternalStore`, you can listen to external state changes and trigger re-render whenever the state updates.

Here is how to combine core logic with `useSyncExternalStore` in the `useQuery` hook.

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

## Step4: Verify Results

Finally, let's verify that `useQuery` works as expected.

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

Please refer to the video below for the correct result.

<video width="100%" height="240" controls>
  <source src="/demo.mov" type="video/mp4">
</video>
