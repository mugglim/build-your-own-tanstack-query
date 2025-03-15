# 소개

[TanStack Query](https://tanstack.com/query/latest)는 서버 상태를 조회, 캐싱, 동기화 기능을 제공하는 도구입니다. TanStack Query는 사용법이 간단하지만, 내부적으로 어떻게 동작하는지는 궁금할 수 있습니다.

Build Your Own Tanstack Query 프로젝트는 TanStack Query를 밑바닥부터 구현하는 방법을 소개합니다. 구현해 볼 작업은 주요 기능 및 추가 기능 2가지입니다.

- 주요 기능

  - 코어 영역: QueryClient, QueryCache, Query, QueryObserver
  - React 영역: useQueryClient, useQuery

- 추가 기능
  - refetchOnWindowFocus
  - React DevTools

최종 결과는 다음과 같습니다. 구현된 코드는 [Github](https://github.com/mugglim/build-your-own-tanstack-query)에서 확인 하실 수 있으며 기여는 언제든지 환영입니다!

<video width="100%" height="240" controls>
  <source src="./public/demo.mov" type="video/mp4">
</video>

## 참고

- [Let's Build React Query in 150 Lines of Code!](https://www.youtube.com/watch?v=9SrIirrnwk0)
- [TanStack Query v5](https://tanstack.com/query/latest)
