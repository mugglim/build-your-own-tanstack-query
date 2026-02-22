# Overview

TanStack Query consists of two layers: the **core layer** and the **library support layer**.

The core layer does not depend on any specific library. It contains the core logic of TanStack Query, including `QueryClient`, `QueryCache`, `Query`, and `QueryObserver`.

The library support layer extends the core logic to support specific libraries. For example, when using TanStack Query with React, you can use the `react-query` package.

> [!TIP] Explore the official TanStack Query source code
> You can find out more about the core and React layers at the following links:
>
> - Core layer: https://github.com/TanStack/query/tree/main/packages/query-core
> - React layer: https://github.com/TanStack/query/tree/main/packages/react-query

## Understanding the Structure of `tanstack-query-lite`

The code we'll be writing is a lightweight implementation of TanStack Query. We'll call the package `tanstack-query-lite`.

> [!WARNING] Not intended for production use  
> `tanstack-query-lite` is for learning purposes only and **should not** be used in production environments.

The `tanstack-query-lite` package consists of two folders.

1. `tanstack-query-lite/core`: Implements code in the core layer.
2. `tanstack-query-lite/react`: Implements code that relies on React.

The following diagram illustrates the structure of `tanstack-query-lite`.

![image](/architecture.png)
