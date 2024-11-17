import axios from "axios";

import useQuery from "tanstack-query-lite/react/useQuery";

import { Post } from "../types/post";

const usePostDetailQuery = ({ id }: { id: string }) => {
  return useQuery<Post>({
    queryKey: ["post", id],
    queryFn: async () => {
      const { data } = await axios.get<Post>(`https://jsonplaceholder.typicode.com/posts/${id}`);

      return data;
    },
  });
};

export default usePostDetailQuery;
