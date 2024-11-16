import { QueryClient } from "./QueryClient";
import { QueryOptions, WithRequired } from "./types";
import { Query } from "./Query";
import { hashKey } from "./util";

type Listener = () => void;

export interface QueryStore {
  has: (queryHash: string) => boolean;
  set: (queryHash: string, query: Query) => void;
  get: (queryHash: string) => Query | undefined;
  delete: (queryHash: string) => void;
  values: () => IterableIterator<Query>;
}

class QueryCache {
  queries: QueryStore;
  listeners: Set<Listener>;

  constructor() {
    this.queries = new Map<string, Query>();
    this.listeners = new Set<Listener>();
  }

  build<TQueryFnData>(client: QueryClient, options: WithRequired<QueryOptions<TQueryFnData>, "queryKey">) {
    const queryKey = options.queryKey;
    const queryHash = hashKey(queryKey);

    let query = this.get<TQueryFnData>(queryHash);

    if (!query) {
      query = new Query({
        cache: this,
        queryKey,
        queryHash,
        options: client.defaultQueryOptions(options),
      });
      this.add(query);
    }

    return query;
  }

  get = <TQueryFnData>(queryHash: string) => {
    return this.queries.get(queryHash) as Query<TQueryFnData> | undefined;
  };

  getAll = () => {
    const queries = this.queries.values();

    return [...queries];
  };

  add = (query: Query<any>) => {
    if (this.queries.has(query.queryHash)) {
      return;
    }

    this.queries.set(query.queryHash, query);
    this.notify();
  };

  remove = (query: Query<any>) => {
    this.queries.delete(query.queryHash);
  };

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  notify = () => {
    this.listeners.forEach((callback) => callback());
  };

  onFocus = () => {
    const queries = this.getAll();

    queries.forEach((query) => {
      query.fetch();
    });
  };
}

export default QueryCache;
