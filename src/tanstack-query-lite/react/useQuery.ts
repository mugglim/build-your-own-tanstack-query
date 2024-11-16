import { QueryClient } from "./../core/QueryClient";
import QueryObserver from "../core/QueryObserver";

import useBaseQuery from "./useBaserQuery";
import { UseQueryOptions } from "./types";

const useQuery = <TQueryFnData>(options: UseQueryOptions<TQueryFnData>, queryClient?: QueryClient) => {
  return useBaseQuery<TQueryFnData>(options, QueryObserver, queryClient);
};

export default useQuery;
