import QueryCache from "./QueryCache";
import QueryObserver from "./QueryObserver";
import { QueryOptions } from "./types";

type QueryStatus = "pending" | "error" | "success";

export type QueryState<TData = unknown, TError = unknown> = {
  status: QueryStatus;
  isFetching: boolean;
  data: TData | undefined;
  error: TError | unknown;
  lastUpdated: number;
};

export class Query {
  cache: QueryCache;
  queryKey: string[];
  queryHash: string;
  options: QueryOptions;
  observers: QueryObserver[] = [];
  state: QueryState;
  promise: Promise<unknown> | null = null;

  gcTimeout?: ReturnType<typeof setTimeout>;

  constructor(options: QueryOptions & { cache: QueryCache }) {
    this.state = {
      data: undefined,
      error: undefined,
      status: "pending",
      isFetching: true,
      lastUpdated: 0,
    };

    this.options = options;

    this.queryKey = options.queryKey;
    this.queryHash = options.queryHash;
    this.cache = options.cache;
  }

  subscribe = (observer: QueryObserver) => {
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

  setState = (updater: (state: QueryState) => QueryState) => {
    this.state = updater(this.state);
    this.observers.forEach((subscriber) => subscriber.notify());

    this.cache.notify();
  };

  fetch = () => {
    if (!this.promise) {
      this.promise = (async () => {
        this.setState((old) => ({ ...old, isFetching: true, error: undefined }));

        try {
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
