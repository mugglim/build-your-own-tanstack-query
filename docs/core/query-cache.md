# QueryCache

`QueryCache`는 `Query`를 **메모리**에 캐싱하는 역할을 담당합니다.

## 인터페이스

### 멤버 변수

- `queries`: `Query` 캐시 데이터를 저장하는 객체 (Map 기반)

### 메소드

- `get`: 캐싱된 `Query`를 반환
- `getAll`: 캐싱된 `Query` 목록을 반환
- `build`: `Query`를 생성하거나 반환
- `remove`: 캐싱된 `Query`를 제거

```javascript
import { Query } from "./Query";
import { hashKey } from "./util";

class QueryCache {
  queries;

  constructor() {
    this.queries = new Map();
  }

  get = (queryHash) => {
    return this.queries.get(queryHash);
  };

  getAll = () => {
    const queries = this.queries.values();

    return [...queries];
  };

  build(client, options) {
    const queryKey = options.queryKey;
    const queryHash = hashKey(queryKey);

    let query = this.get(queryHash);

    if (!query) {
      query = new Query({
        cache: this,
        queryKey,
        queryHash,
        options: client.defaultQueryOptions(options)
      });

      this.queries.set(query.queryHash, query);
      this.notify();
    }

    return query;
  }

  remove = (query) => {
    this.queries.delete(query.queryHash);
  };
}
```

## 설명

### 캐싱은 어떻게 동작하나요?

`QueryCache`는 `queries` 변수를 사용해 메모리에 캐시 데이터를 저장합니다.

`queries` 변수는 [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) 사용합니다. key-value는 다음과 같습니다.

- `key`: `Query`의 `queryHash`
- `value`: `Query` 객체 인스턴스

> [!TIP] queryHash가 무엇인가요?
>
> - `Query`의 `queryKey`를 해싱한 값을 의미합니다.
> - 해싱은 [hashKey](https://github.com/mugglim/build-your-own-tanstack-query/blob/main/tanstack-query-lite/core/util.js#L2) 함수를 사용합니다.

### `QueryCache`에 어떻게 캐시를 추가하나요?

`build` 메소드를 사용합니다.

`queries`에 `Query`가 캐싱되어 있는 경우, 캐싱된 Query를 반환합니다.

```javascript{7-21}
class QueryCache {

  build(client, options) {
    const queryKey = options.queryKey;
    const queryHash = hashKey(queryKey);

    let query = this.get(queryHash);

    if (!query) {
      query = new Query({
        cache: this,
        queryKey,
        queryHash,
        options: client.defaultQueryOptions(options)
      });

      this.queries.set(query.queryHash, query);
    }

    // 캐싱되어 있는 Query를 반환합니다.
    return query;
  }
}
```
