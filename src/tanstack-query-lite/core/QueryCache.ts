import { QueryOptions } from "./types";
import { Query } from "./Query";

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

  getQuery = (options: QueryOptions) => {
    const queryHash = JSON.stringify(options.queryKey);
    let query = this.queries.get(queryHash);

    if (!query) {
      query = new Query({ cache: this, ...options });
      this.queries.set(query.queryHash, query);
    }

    return query;
  };

  add = (query: Query) => {
    if (this.queries.has(query.queryHash)) {
      return;
    }

    this.notify();
  };

  remove = (query: Query) => {
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

  getAll = () => {
    const queries = this.queries.values();

    return [...queries];
  };

  onFocus = () => {
    const queries = this.getAll();

    queries.forEach((query) => {
      query.fetch();
    });
  };
}

export default QueryCache;
