export type QueryOptions = {
  staleTime?: number;
  gcTime?: number;
  queryFn: () => Promise<unknown>;

  // for query config
  queryKey: string[];
  queryHash: string;
};
