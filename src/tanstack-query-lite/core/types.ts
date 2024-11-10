// UTIL TYPES

/** {@link https://github.com/TanStack/query/blob/74c65cc2db0fa378c108448445f38464e1acd27a/packages/query-core/src/types.ts#L390-L392 More info } */
export type WithRequired<TTarget, TKey extends keyof TTarget> = TTarget & {
  [_ in TKey]: {};
};

/** {@link https://github.com/TanStack/query/blob/74c65cc2db0fa378c108448445f38464e1acd27a/packages/query-core/src/types.ts#L11-L21 More info } */
export type OmitKeyof<
  TObject,
  TKey extends TStrictly extends "safely"
    ?
        | keyof TObject
        | (string & Record<never, never>)
        | (number & Record<never, never>)
        | (symbol & Record<never, never>)
    : keyof TObject,
  TStrictly extends "strictly" | "safely" = "strictly",
> = Omit<TObject, TKey>;

// CORE TYPES

export type QueryKey = ReadonlyArray<unknown>;

export interface QueryOptions {
  queryKey?: QueryKey;
  queryHash?: string;
  staleTime?: number;
  gcTime?: number;
  queryFn?: () => Promise<unknown>;
}

// TODO: Change to interface
export type QueryObserverOptions = WithRequired<QueryOptions, "queryKey">;

export interface DefaultOptions {
  queires?: OmitKeyof<QueryObserverOptions, "queryKey">;
}

// TODO: Change to interface
export type DefaultedQueryObserverOptions = WithRequired<QueryObserverOptions, "queryHash">;
