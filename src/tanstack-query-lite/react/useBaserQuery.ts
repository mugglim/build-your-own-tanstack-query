import { useQueryClient } from "./QueryClientProvider";
import { QueryClient } from "./../core/QueryClient";
import QueryObserver from "../core/QueryObserver";
import { useCallback, useState, useSyncExternalStore } from "react";
import { UseBaseQueryOptions } from "./types";

const useBaseQuery = (options: UseBaseQueryOptions, Observer: typeof QueryObserver, queryClient?: QueryClient) => {
  const client = useQueryClient(queryClient);

  const [observer] = useState(() => {
    const defaultOptions = client.defaultQueryOptions(options);

    return new Observer(client, defaultOptions);
  });

  useSyncExternalStore(
    useCallback(
      (onStoreChange) => {
        const unsubscribe = observer.subscribe(onStoreChange);

        return unsubscribe;
      },
      [observer]
    ),
    () => observer.getResult(),
    () => observer.getResult()
  );

  return observer.getResult();
};

export default useBaseQuery;
