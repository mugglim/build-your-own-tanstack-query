# 구조

TanStack Query를 재작성한 코드를 `tanstack-query-lite`로 부르겠습니다. 코드는 2가지 폴더로 분리되어 있습니다.

- **tanstack-query-lite/core**: 외부 환경에 의존되지 않는 코드입니다. QueryClient, QueryCache, Query, QueryObserver 객체가 포함됩니다.
- **tanstack-query-lite/react:** React 라이브러리에 의존되는 코드입니다. 내부적으로 core 폴더의 코드를 의존하고 있습니다.

![image](./architecture.png)
