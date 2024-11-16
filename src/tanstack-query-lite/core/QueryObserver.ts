import { QueryClient } from "./QueryClient";
import { QueryObserverOptions } from "./types";

class QueryObserver<TQueryFnData> {
  client: QueryClient;
  options: QueryObserverOptions<TQueryFnData>;

  constructor(client: QueryClient, options: QueryObserverOptions<TQueryFnData>) {
    this.client = client;
    this.options = options;
  }

  notify = () => {};

  getQuery = () => {
    const query = this.client.getQueryCache().build(this.client, this.options);

    return query;
  };

  getResult = () => {
    return this.getQuery().state;
  };

  executeFetch = () => {
    const query = this.client.getQueryCache().build(this.client, this.options);

    return query.fetch();
  };

  fetch = () => {
    const query = this.getQuery();

    const { staleTime = 0 } = this.options;
    const { lastUpdated } = query.state;

    const needsToFetch = !lastUpdated || Date.now() - lastUpdated > staleTime;

    if (!needsToFetch) {
      return;
    }

    this.executeFetch();
  };

  subscribe = (callback: () => void) => {
    this.notify = callback;
    const query = this.getQuery();

    const unsubscribe = query.subscribe(this);

    this.fetch();

    return unsubscribe;
  };
}

export default QueryObserver;
