import { createContext, ReactNode, useContext, useEffect } from "react";
import { QueryClient } from "../core/QueryClient";

export const QueryClientContext = createContext<QueryClient | null>(null);

export const useQueryClient = (queryClient?: QueryClient) => {
  const client = useContext(QueryClientContext);

  if (queryClient) {
    return queryClient;
  }

  if (!client) {
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  }

  return client;
};

export const QueryClientProvider = ({ children, client }: { children: ReactNode; client: QueryClient }) => {
  useEffect(() => {
    const cache = client.getQueryCache();

    const onFocus = () => {
      cache.onFocus();
    };

    window.addEventListener("visibilityhange", onFocus, false);
    window.addEventListener("focus", onFocus, false);

    return () => {
      window.addEventListener("visibilityhange", onFocus, false);
      window.addEventListener("focus", onFocus, false);
    };
  }, [client]);

  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
};
