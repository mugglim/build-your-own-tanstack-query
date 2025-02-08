import { createContext, useContext, useEffect } from "react";

export const QueryClientContext = createContext(null);

export const useQueryClient = (queryClient) => {
  const client = useContext(QueryClientContext);

  if (queryClient) {
    return queryClient;
  }

  if (!client) {
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  }

  return client;
};

export const QueryClientProvider = ({ children, client }) => {
  useEffect(() => {
    const cache = client.getQueryCache();

    const onFocus = () => {
      cache.onFocus();
    };

    window.addEventListener("visibilitychange", onFocus, false);
    window.addEventListener("focus", onFocus, false);

    return () => {
      window.removeEventListener("visibilitychange", onFocus, false);
      window.removeEventListener("focus", onFocus, false);
    };
  }, [client]);

  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
};
