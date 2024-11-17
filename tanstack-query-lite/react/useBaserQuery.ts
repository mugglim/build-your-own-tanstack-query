import { useCallback, useState, useSyncExternalStore } from "react";

import { QueryClient } from "../core/QueryClient";
import QueryObserver from "../core/QueryObserver";
import { QueryState } from "../core/Query";

import { useQueryClient } from "./QueryClientProvider";
import { UseBaseQueryOptions } from "./types";

const useBaseQuery = <TQueryFnData>(
  options: UseBaseQueryOptions<TQueryFnData>,
  Observer: typeof QueryObserver<TQueryFnData>,
  queryClient?: QueryClient
): QueryState<TQueryFnData> => {
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
