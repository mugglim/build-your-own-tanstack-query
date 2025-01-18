const noop = () => {};

class QueryObserver {
  client;
  options;
  notify = noop;

  constructor(client, options) {
    this.client = client;
    this.options = options;
  }

  getQuery = () => {
    const query = this.client.getQueryCache().build(this.client, this.options);

    return query;
  };

  getResult = () => {
    return this.getQuery().state;
  };

  subscribe = (callback) => {
    this.notify = callback;

    const query = this.getQuery();

    const { lastUpdated } = query.state;
    const { staleTime } = this.options;

    const needsToFetch = !lastUpdated || Date.now() - lastUpdated > staleTime;

    const unsubscribeQuery = query.subscribe(this);

    if (needsToFetch) {
      query.fetch();
    }

    const unsubscribe = () => {
      unsubscribeQuery();
      this.notify = noop;
    };

    return unsubscribe;
  };
}

export default QueryObserver;
