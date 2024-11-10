import { QueryClient } from "./../core/QueryClient";
import QueryObserver from "../core/QueryObserver";

import useBaseQuery from "./useBaserQuery";
import { UseQueryOptions } from "./types";

const useQuery = (options: UseQueryOptions, queryClient?: QueryClient) => {
  return useBaseQuery(options, QueryObserver, queryClient);
};

export default useQuery;
