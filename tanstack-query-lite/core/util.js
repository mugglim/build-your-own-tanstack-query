/** {@link https://github.com/TanStack/query/blob/74c65cc2db0fa378c108448445f38464e1acd27a/packages/query-core/src/utils.ts#L201-L216 More info } */
export function hashKey(queryKey) {
  return JSON.stringify(queryKey);
}
