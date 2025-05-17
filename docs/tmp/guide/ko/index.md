# 개요

TanStack Query의 구조는 **코어 영역**과 **라이브러리 지원 영역**으로 분리해 볼 수 있습니다.

코어 영역은 특정 라이브러리를 의존하지 않습니다. 코어 영역에는 TanStack Query의 핵심 로직인 `QueryClient`, `QueryCache`, `Query`, `QueryObserver`이 있습니다.

라이브러리 지원 영역은 코어 영역의 코드를 기반하여, 특정 라이브러리에서 TanStack Query를 사용할 수 있는 코드를 제공합니다. 예를 들어 React에서 TanStack Query를 사용하는 경우에는 react-query 패키지를 사용하면 됩니다.

> [!TIP] TanStack Query에서 제공하는 코드가 궁금해요.
> 코어 영역과 React 영역 코드는 다음 링크로 확인하실 수 있습니다.
>
> - 코어 영역: https://github.com/TanStack/query/tree/main/packages/query-core
> - React 영역: https://github.com/TanStack/query/tree/main/packages/react-query

## tanstack-query-lite 구조 이해하기

앞으로 우리가 작성해 볼 코드는 경량화된 TanStack Query입니다. 앞으로 작성할 패키지의 이름을 `tanstack-query-lite`로 부르겠습니다.

> [!WARNING] production 환경에서 사용을 주의하세요.
> `tanstack-query-lite`는 학습을 위한 코드입니다. production 환경에서 사용은 **지양합니다**.

`tanstack-query-lite` 패키지는 두 가지 폴더로 분리되어 있습니다.

1. `tanstack-query-lite/core`: 코어 영역의 코드를 구현합니다.
2. `tanstack-query-lite/react`: React를 의존하는 코드를 구현합니다.

`tanstack-query-lite` 패키지의 전체적인 구조는 다음과 같습니다.

![image](/architecture.png)
