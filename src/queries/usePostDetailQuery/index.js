import axios from "axios";

import useQuery from "tanstack-query-lite/react/useQuery";

const usePostDetailQuery = ({ id }) => {
  return useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const { data } = await axios.get(`https://jsonplaceholder.typicode.com/posts/${id}`);

      return data;
    }
  });
};

export default usePostDetailQuery;
