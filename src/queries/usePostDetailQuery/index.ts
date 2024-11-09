import axios from "axios";

import useQuery from "../../tanstack-query-lite/react/useQuery";

const usePostDetailQuery = ({ id }: { id: string }) => {
  return useQuery({
    queryKey: ["posts", id],
    queryHash: JSON.stringify(["posts", id]),
    queryFn: async () => {
      const { data } = await axios.get(`https://jsonplaceholder.typicode.com/posts/${id}`);

      return data;
    },
    staleTime: 3_000,
    gcTime: 5_000,
  });
};

export default usePostDetailQuery;