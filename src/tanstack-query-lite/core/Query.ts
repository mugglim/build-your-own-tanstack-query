import QueryCache from "./QueryCache";
import QueryObserver from "./QueryObserver";
import { QueryKey, QueryOptions } from "./types";

type QueryStatus = "pending" | "error" | "success";

export interface QueryState<TData = unknown, TError = unknown> {
  status: QueryStatus;
  isFetching: boolean;
  data: TData | undefined;
  error: TError | unknown;
  lastUpdated: number;
}

export interface QueryConfig<TQueryFnData> {
  cache: QueryCache;
  queryKey: QueryKey;
  queryHash: string;
  options?: QueryOptions<TQueryFnData>;
  defaultOptions?: QueryOptions<TQueryFnData>;
}

export class Query<TQueryFnData = unknown> {
  cache: QueryCache;
  queryKey: QueryKey;
  queryHash: string;
  options: QueryOptions<TQueryFnData>;
  observers: QueryObserver<TQueryFnData>[];
  state: QueryState<TQueryFnData>;
  promise: Promise<unknown> | null = null;

  gcTimeout?: ReturnType<typeof setTimeout>;

  constructor(config: QueryConfig<TQueryFnData>) {
    this.state = {
      data: undefined,
      error: undefined,
      status: "pending",
      isFetching: true,
      lastUpdated: 0,
    };

    this.observers = [];
    this.cache = config.cache;
    this.queryHash = config.queryHash;
    this.queryKey = config.queryKey;
    this.options = {
      ...config.defaultOptions,
      ...config.options,
    };
  }

  subscribe = (observer: QueryObserver<TQueryFnData>) => {
    this.observers.push(observer);
    this.unscheduleGC();

    return () => {
      this.observers = this.observers.filter((d) => d !== observer);

      if (!this.observers.length) {
        this.scheduleGC();
      }
    };
  };

  scheduleGC = () => {
    const { gcTime } = this.options;

    this.gcTimeout = setTimeout(() => {
      this.cache.remove(this);
    }, gcTime);
  };

  unscheduleGC = () => {
    clearTimeout(this.gcTimeout);
  };

  setState = (updater: (state: QueryState<TQueryFnData>) => QueryState<TQueryFnData>) => {
    this.state = updater(this.state);
    this.observers.forEach((subscriber) => subscriber.notify());

    this.cache.notify();
  };

  fetch = () => {
    if (!this.promise) {
      this.promise = (async () => {
        this.setState((old) => ({ ...old, isFetching: true, error: undefined }));

        try {
          if (!this.options.queryFn) {
            throw new Error(`Missing queryFn: '${this.options.queryHash}'`);
          }

          const data = await this.options.queryFn();

          this.setState((old) => ({ ...old, status: "success", data }));
        } catch (error) {
          this.setState((old) => ({ ...old, status: "error", error }));
        } finally {
          this.setState((old) => ({ ...old, isFetching: false }));

          this.promise = null;
        }
      })();
    }

    return this.promise;
  };
}
