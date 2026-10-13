/** Present plain-text post previews and explicit PRD author glyphs. */
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { getAvatar, getAuthorRole } from "./Avatar";
import { canManagePost, formatPostDate } from "../utils/posts";
const accents = [
  "border-t-primary-500",
  "border-t-secondary-500",
  "border-t-pink-500",
  "border-t-teal-500",
];

/** Render one linked preview without treating user content as markup.
 * Args: post {object} Validated post. index {number} Position for the border cycle.
 * Returns: {JSX.Element} Accessible reading card.
 */
export function BlogCard({ post, index = 0 }) {
  return (
    <article
      className={`flex h-full flex-col rounded-card border border-border border-t-4 bg-surface ${accents[index % 4]}`}
    >
      <Link
        to={`/blog/${post.id}`}
        className="block flex-1 rounded-card p-6 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <h2 className="break-words font-display text-2xl leading-snug text-foreground">
          {post.title}
        </h2>
        <p className="mt-4 break-words leading-relaxed text-foreground-muted">
          {post.content.slice(0, 120)}
        </p>
        <p className="mt-6 flex items-center gap-2 text-sm text-foreground-muted">
          {getAvatar(getAuthorRole(post.authorId))}
          <span className="break-words">{post.authorName}</span>
        </p>
        <time
          dateTime={post.createdAt}
          className="mt-2 block text-sm text-foreground-muted"
        >
          {formatPostDate(post.createdAt)}
        </time>
      </Link>
      {canManagePost(post) && (
        <Link
          to={`/edit/${post.id}`}
          aria-label={`Edit ${post.title}`}
          className="mx-6 mb-6 inline-flex items-center gap-2 rounded-control border border-primary-200 px-4 py-2 font-semibold text-primary-700 hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <path d="M16 3l5 5L8 21H3v-5L16 3zM14 5l5 5" />
          </svg>
          Edit
        </Link>
      )}
    </article>
  );
}
BlogCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    authorId: PropTypes.string.isRequired,
    authorName: PropTypes.string.isRequired,
  }).isRequired,
  index: PropTypes.number,
};
