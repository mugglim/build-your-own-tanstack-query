import { createFileRoute, Link } from "@tanstack/react-router";
import usePostListQuery from "../queries/usePostListQuery";

const Index = () => {
  const { data: postListData } = usePostListQuery();

  if (!postListData) {
    return <div>loading...</div>;
  }

  return (
    <ul>
      {/* @ts-ignore */}
      {postListData.map((post) => {
        const { id, title } = post;

        return (
          <li key={id} className="border-b-4">
            <Link to={`/posts/${id}`}>{title}</Link>
          </li>
        );
      })}
    </ul>
  );
};

export const Route = createFileRoute("/")({
  component: Index,
});
