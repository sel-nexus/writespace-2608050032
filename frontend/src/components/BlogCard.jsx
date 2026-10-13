/** Present plain-text post previews and explicit PRD author glyphs. */
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { ADMIN_ID } from "../utils/auth";
import { formatPostDate } from "../utils/posts";
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
      className={`h-full rounded-card border border-border border-t-4 bg-surface ${accents[index % 4]}`}
    >
      <Link
        to={`/blog/${post.id}`}
        className="block h-full rounded-card p-6 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <h2 className="break-words font-display text-2xl leading-snug text-foreground">
          {post.title}
        </h2>
        <p className="mt-4 break-words leading-relaxed text-foreground-muted">
          {post.content.slice(0, 120)}
        </p>
        <p className="mt-6 flex items-center gap-2 text-sm text-foreground-muted">
          <span aria-hidden="true">
            {post.authorId === ADMIN_ID ? "👑" : "📚"}
          </span>
          <span className="break-words">{post.authorName}</span>
        </p>
        <time
          dateTime={post.createdAt}
          className="mt-2 block text-sm text-foreground-muted"
        >
          {formatPostDate(post.createdAt)}
        </time>
      </Link>
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
