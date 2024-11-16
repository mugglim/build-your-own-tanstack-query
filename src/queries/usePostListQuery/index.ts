import axios from "axios";

import useQuery from "../../tanstack-query-lite/react/useQuery";
import { Post } from "./../types/post";

const usePostListQuery = () => {
  return useQuery<Post[]>({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data } = await axios.get<Post[]>("https://jsonplaceholder.typicode.com/posts");

      return data.slice(0, 5);
    },
  });
};

export default usePostListQuery;
