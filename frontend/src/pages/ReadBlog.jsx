/** Read plain text and expose only currently authorized management actions. */
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getAvatar, getAuthorRole } from "../components/Avatar";
import {
  canManagePost,
  deletePost,
  findPost,
  formatPostDate,
} from "../utils/posts";

/** Render an identified post or a recoverable missing-resource state.
 * Returns: {JSX.Element} Article and back link.
 */
export default function ReadBlog() {
  const { id } = useParams();
  const post = findPost(id);
  const [deleteError, setDeleteError] = useState("");
  const navigate = useNavigate();

  /** Confirm deletion and retain the reader and stored post on any failed write. */
  function remove() {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setDeleteError("");
    try {
      deletePost(id);
      navigate("/blogs");
    } catch (error) {
      setDeleteError(error.message);
    }
  }
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-12 sm:py-20">
      {post ? (
        <article>
          <h1 className="break-words font-display text-4xl leading-tight sm:text-5xl">
            {post.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-border pb-8 text-sm text-foreground-muted">
            {getAvatar(getAuthorRole(post.authorId))}
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
      {post && canManagePost(post) && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={`/edit/${post.id}`}
            className="rounded-control border border-primary-200 bg-surface px-4 py-3 font-semibold text-primary-700 hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={remove}
            className="rounded-control border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-600 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-ring"
          >
            Delete
          </button>
        </div>
      )}
      {deleteError && (
        <p
          role="alert"
          className="mt-6 rounded-control bg-error-light p-4 text-error"
        >
          {deleteError}
        </p>
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
