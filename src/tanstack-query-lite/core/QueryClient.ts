import QueryCache from "./QueryCache";
import { DefaultedQueryObserverOptions, DefaultOptions, QueryObserverOptions } from "./types";
import { hashKey } from "./util";

export type QueryClientConfig = {
  cache?: QueryCache;
  defaultOptions?: DefaultOptions;
};

export class QueryClient {
  cache: QueryCache;
  defaultOptions?: DefaultOptions;

  constructor(config: QueryClientConfig = {}) {
    this.cache = config.cache || new QueryCache();
    this.defaultOptions = config.defaultOptions;
  }

  getQueryCache = () => {
    return this.cache;
  };

  defaultQueryOptions = (options: QueryObserverOptions): DefaultedQueryObserverOptions => {
    const mergedQueryOptions = {
      ...this.defaultOptions?.queires,
      ...options,
    };

    const defaultedQueryOptions = {
      ...mergedQueryOptions,
      queryHash: mergedQueryOptions.queryHash || hashKey(mergedQueryOptions.queryKey),
    };

    return defaultedQueryOptions;
  };
}
