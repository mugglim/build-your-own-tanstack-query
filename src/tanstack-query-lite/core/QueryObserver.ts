import { QueryClient } from "./QueryClient";

type QueryObserverOptions = {
  staleTime?: number;
  gcTime?: number;
  queryKey: string[];
  queryHash: string;
  queryFn: () => Promise<unknown>;
};

class QueryObserver {
  client: QueryClient;
  options: QueryObserverOptions;

  constructor(client: QueryClient, options: QueryObserverOptions) {
    this.client = client;
    this.options = options;
  }

  notify = () => {};

  getQuery = () => {
    const query = this.client.getQueryCache().getQuery(this.options);

    return query;
  };

  getResult = () => {
    return this.getQuery().state;
  };

  executeFetch = () => {
    const query = this.client.getQueryCache().getQuery(this.options);

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
