import { QueryObserverOptions } from "../core/types";

export interface UseBaseQueryOptions<TQueryFnData> extends QueryObserverOptions<TQueryFnData> {}

export interface UseQueryOptions<TQueryFnData> extends UseBaseQueryOptions<TQueryFnData> {}
