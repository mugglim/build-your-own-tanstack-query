import QueryCache from "./QueryCache";

export class QueryClient {
  cache: QueryCache;

  constructor() {
    this.cache = new QueryCache();
  }

  getQueryCache = () => {
    return this.cache;
  };
}
