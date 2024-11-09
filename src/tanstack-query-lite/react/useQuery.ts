import { QueryClient } from "./../core/QueryClient";
import { QueryOptions } from "../core/types";
import QueryObserver from "../core/QueryObserver";
import useBaseQuery from "./useBaserQuery";

const useQuery = (options: QueryOptions, queryClient?: QueryClient) => {
  return useBaseQuery(options, QueryObserver, queryClient);
};

export default useQuery;
