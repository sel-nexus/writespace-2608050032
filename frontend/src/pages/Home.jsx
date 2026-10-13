/** Show all browser-local writing in newest-first reading order. */
import { Link } from "react-router-dom";
import { BlogCard } from "../components/BlogCard";
import { listPosts } from "../utils/posts";

/** Render the responsive library and its first-post invitation.
 * Returns: {JSX.Element} Reading grid or empty state.
 */
export default function Home() {
  const posts = listPosts();
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-6 py-12 sm:py-20">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
            The reading room
          </p>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl">All Blogs</h1>
          <p className="mt-4 text-foreground-muted">
            Fresh thoughts, shared in this browser.
          </p>
        </div>
        {posts.length > 0 && (
          <Link
            to="/write"
            className="rounded-control bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Write
          </Link>
        )}
      </header>
      {posts.length === 0 ? (
        <section className="rounded-card border border-border bg-surface px-6 py-16 text-center">
          <h2 className="font-display text-2xl">
            No blogs yet. Be the first to write one!
          </h2>
          <Link
            to="/write"
            className="mt-6 inline-block rounded-control bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Write
          </Link>
        </section>
      ) : (
        <section
          aria-label="All posts"
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {posts.map((post, index) => (
            <BlogCard key={post.id} post={post} index={index} />
          ))}
        </section>
      )}
    </main>
  );
}
