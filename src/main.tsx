import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import router from "./router.js";

import { QueryClient } from "./tanstack-query-lite/core/QueryClient";
import { QueryClientProvider } from "./tanstack-query-lite/react/QueryClientProvider";
import ReactQueryDevtools from "./tanstack-query-lite/react/ReactQueryDevtools";

import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queires: {
      staleTime: 0,
      gcTime: 1_000 * 60,
    },
  },
});

const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ReactQueryDevtools />
      </QueryClientProvider>
    </StrictMode>
  );
}
