/** Read complete plain text without edit or delete actions in this slice. */
import { Link, useParams } from "react-router-dom";
import { ADMIN_ID } from "../utils/auth";
import { findPost, formatPostDate } from "../utils/posts";

/** Render an identified post or a recoverable missing-resource state.
 * Returns: {JSX.Element} Article and back link.
 */
export default function ReadBlog() {
  const { id } = useParams();
  const post = findPost(id);
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-12 sm:py-20">
      {post ? (
        <article>
          <h1 className="break-words font-display text-4xl leading-tight sm:text-5xl">
            {post.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-border pb-8 text-sm text-foreground-muted">
            <span aria-hidden="true">
              {post.authorId === ADMIN_ID ? "👑" : "📚"}
            </span>
            <span className="break-words">{post.authorName}</span>
            <time dateTime={post.createdAt}>
              {formatPostDate(post.createdAt)}
            </time>
          </div>
          <p className="mt-8 whitespace-pre-wrap break-words text-lg leading-relaxed">
            {post.content}
          </p>
        </article>
      ) : (
        <h1 className="font-display text-4xl">Post not found</h1>
      )}
      <Link
        to="/blogs"
        className="mt-12 inline-block rounded-control px-4 py-3 font-semibold text-primary-700 hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring"
      >
        Back to All Posts
      </Link>
    </main>
  );
}
