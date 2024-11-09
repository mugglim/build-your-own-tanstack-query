import { useQueryClient } from "./QueryClientProvider";
import { QueryClient } from "./../core/QueryClient";
import QueryObserver from "../core/QueryObserver";
import { QueryOptions } from "./../core/types";
import { useCallback, useState, useSyncExternalStore } from "react";

const useBaseQuery = (options: QueryOptions, Observer: typeof QueryObserver, queryClient?: QueryClient) => {
  const client = useQueryClient(queryClient);

  const [observer] = useState(() => {
    const { queryKey, queryFn, staleTime, gcTime = 5 * 60 * 1000 } = options;

    return new Observer(client, {
      queryKey,
      queryHash: JSON.stringify(queryKey),
      queryFn,
      staleTime,
      gcTime,
    });
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
