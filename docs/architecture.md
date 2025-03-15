# 구조

TanStack Query는 외부 라이브리에 의존하지 않는 코어 영역의 코드가 패키지로 분리되어 있습니다. [query-core](https://github.com/TanStack/query/tree/main/packages/query-core) 패키지로 관리되고 있으며 QueryCache, QueryClient와 같은 코드가 구현되어 있습니다.

TanStack Query는 특정 라이브러리에서 바로 사용할 수 있는 패키지도 관리하고 있습니다. 기반은 query-core 패키지를 사용하며 라이브러리의 문법과 생명주기에 맞춰서 query-core 코드를 의존하고 있습니다.

예를들어 React에서 TanStack Query를 사용하는 경우 [react-query](https://github.com/TanStack/query/tree/main/packages/react-query) 패키지를 사용하면 됩니다.

## tanstack-query-lite

이제 우리가 직접 구현해 볼 코드는 경량화 된 TanStack Query입니다. 실제 코드와 완벽히 일치하지 않아 발생하는 혼란을 방지하기 위해, 패키지명을 `tanstack-query-lite`로 부르겠습니다.

- `tanstack-query-lite/core`: 경량화 된 query-core 패키지
- `tanstack-query-lite/react`: 경량화 된 react-query 패키지

구현해 볼 전체적인 구조는 다음과 같습니다.

![image](./architecture.png)
