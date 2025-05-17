# Overview

The structure of TanStack Query can be divided into two parts: **core layer** and **library support layer**.

The core layer does not depend on any specific library. It contains the core logic of TanStack Query, including `QueryClient`, `QueryCache`, `Query`, and `QueryObserver`.

The library support layer builds on top of the core logic and provides code that allows TanStack Query to be used with specific libraries. For example, when using TanStack Query with React, you can use the `react-query` package.

> [!TIP] Want to explore the code provided by TanStack Query?  
> You can check out the core and React layers at the following links:
>
> - Core layer: https://github.com/TanStack/query/tree/main/packages/query-core
> - React layer: https://github.com/TanStack/query/tree/main/packages/react-query

## Understanding the Structure of `tanstack-query-lite`

The code we'll be writing is a lightweight version of TanStack Query. We'll refer to the package as `tanstack-query-lite`.

> [!WARNING] Not intended for production use  
> `tanstack-query-lite` is for learning purposes only and **should not** be used in production environments.

The `tanstack-query-lite` package is organized into two folders:

1. `tanstack-query-lite/core`: Implements the core logic.
2. `tanstack-query-lite/react`: Implements React-specific code.

Here's the overall structure of the `tanstack-query-lite` package:

![image](/architecture.png)
