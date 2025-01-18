import axios from "axios";

import useQuery from "tanstack-query-lite/react/useQuery";

const usePostListQuery = () => {
  return useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data } = await axios.get("https://jsonplaceholder.typicode.com/posts");

      return data.slice(0, 5);
    }
  });
};

export default usePostListQuery;
