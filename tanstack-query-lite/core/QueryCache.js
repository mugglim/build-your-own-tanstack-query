import { Query } from "./Query";
import { hashKey } from "./util";

class QueryCache {
  queries;
  listeners;

  constructor() {
    this.queries = new Map();
    this.listeners = new Set();
  }

  get = (queryHash) => {
    return this.queries.get(queryHash);
  };

  getAll = () => {
    const queries = this.queries.values();

    return [...queries];
  };

  build(client, options) {
    const queryKey = options.queryKey;
    const queryHash = hashKey(queryKey);

    let query = this.get(queryHash);

    if (!query) {
      query = new Query({
        cache: this,
        queryKey,
        queryHash,
        options: client.defaultQueryOptions(options)
      });

      this.queries.set(query.queryHash, query);
      this.notify();
    }

    return query;
  }

  remove = (query) => {
    this.queries.delete(query.queryHash);
  };

  subscribe = (listener) => {
    this.listeners.add(listener);

    const unsubscribe = () => {
      this.listeners.delete(listener);
    };

    return unsubscribe;
  };

  notify = () => {
    this.listeners.forEach((callback) => {
      callback();
    });
  };

  onFocus = () => {
    const queries = this.getAll();

    queries.forEach((query) => {
      query.fetch();
    });
  };
}

export default QueryCache;
