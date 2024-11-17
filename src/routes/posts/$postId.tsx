import { createFileRoute } from "@tanstack/react-router";

import usePostDetailQuery from "~/queries/usePostDetailQuery";

const PostDetail = () => {
  const { postId } = Route.useParams();

  const { data: postDetailData } = usePostDetailQuery({ id: postId });

  if (!postDetailData) {
    return <div>loading...</div>;
  }

  return <>{postDetailData.title}</>;
};

export const Route = createFileRoute("/posts/$postId")({
  component: PostDetail,
});
