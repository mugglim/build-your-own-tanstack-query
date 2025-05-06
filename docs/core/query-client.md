# QueryClient

`QueryClient`는 전체적인 기능을 담당합니다. `QueryCache`를 의존하며, 전역적으로 `Query`의 옵션값을 지정할 수 있습니다.

## 인터페이스

### 멤버 변수

- `cache`: `QueryCache` 객체
- `defaultOptions`: `Query` 객체의 전역 옵션값

### 메소드

- `defaultQueryOptions`: `Query` 객체의 전역 옵션값을 반환
- `getQueryCache`: 의존하고 있는 `QueryCache` 객체를 반환

```javascript
import QueryCache from "./QueryCache";
import { hashKey } from "./utils";

class QueryClient {
  cache;
  defaultOptions;

  constructor(config) {
    this.cache = config.cache || new QueryCache();
    this.defaultOptions = config.defaultOptions;
  }

  getQueryCache = () => {
    return this.cache;
  };

  defaultQueryOptions = (options) => {
    // `options`가 전달되는 경우 `defaultOptions`와 병합하는 과정을 진행합니다.
    const mergedQueryOptions = {
      ...this.defaultOptions?.queries,
      ...options
    };

    const defaultedQueryOptions = {
      ...mergedQueryOptions,
      queryHash: mergedQueryOptions.queryHash || hashKey(mergedQueryOptions.queryKey)
    };

    return defaultedQueryOptions;
  };
}
```

## 설명

### `defaultOptions`에는 어떤 값을 지정할 수 있나요?

`Query`에서 제공하는 옵션값을 지정할 수 있습니다.

예를 들어 아래와 같이 `defaultOptions`을 지정하면, `Query`의 기본 `staleTime` 값을 `Infinity`로 할당합니다.

```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity }
  }
});
```

### `QueryClient`를 언제 생성하나요?

`QueryClient`는 루트 영역에 선언하여 싱글톤 형태로 전역으로 관리합니다.

> [!TIP] React QueryClientProvider
>
> - React에서는 [QueryClientProvider](https://tanstack.com/query/latest/docs/framework/react/reference/QueryClientProvider)를 통해 전역으로 관리합니다.

### `hashKey` 함수는 무엇인가요?

`Query`의 queryKey 값을 직렬화하는 함수입니다. 내부적으로 `JSON.stringify()` 메소드를 사용합니다.

```javascript
export function hashKey(queryKey) {
  return JSON.stringify(queryKey);
}
```

> [!TIP] 실제 hashKey 함수는 어떻게 구현되어 있나요?
>
> - hashKey 함수는 query-core 패키지 하위 utils 폴더에 위치하고 있습니다.
> - 상세한 코드는 아래 링크를 참고해 주세요.
>   > https://github.com/TanStack/query/blob/74c65cc2db0fa378c108448445f38464e1acd27a/packages/query-core/src/utils.ts#L201-L216
