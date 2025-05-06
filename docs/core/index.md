# 코어 영역

특정 라이브러리에 의존하지 않는 코어 영역을 알아봅니다.

## 목표

- 코어 영역의 동작 원리를 알아봅니다.
- 코어 영역을 구성하는 `QueryClient`, `QueryCache`, `Query`, `QueryObserver` 객체를 구현해 봅니다.

## 구조 이해하기

TanStack Query의 구조를 알아봅니다.

### TanStack Query 구조 이해하기

TanStack Query 코드는 두 가지로 분리해 볼 수 있습니다.

**1. 코어 영역**

- 외부 라이브러리에 의존하지 않습니다.
- [query-core](https://github.com/TanStack/query/tree/main/packages/query-core) 패키지를 의미합니다.
- QueryCache, QueryClient와 같은 코드가 구현되어 있습니다.

**2. 라이브러리 영역**

- 특정 라이브러리에 의존합니다.
- React를 의존하는 코드는 [react-query](https://github.com/TanStack/query/tree/main/packages/react-query) 패키지를 의미합니다.

### `tanstack-query-lite` 구조 이해하기

우리가 작성해 볼 코드는 경량화된 TanStack Query입니다. 앞으로 작성할 패키지의 이름을 **tanstack-query-lite**로 부르겠습니다.

tanstack-query-lite 패키지는 두 가지 폴더로 분리되어 있습니다.

1. `tanstack-query-lite/core`: 코어 영역의 코드를 구현합니다.
2. `tanstack-query-lite/react`: React를 의존하는 코드를 구현합니다.

전체적인 구조는 다음과 같습니다.

![image](/architecture.png)
