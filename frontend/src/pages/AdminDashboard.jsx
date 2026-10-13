/** Summarize actual local activity and moderate the newest writing. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "../components/StatCard";
import { getStats } from "../utils/users";
import { deletePost, listPosts, formatPostDate } from "../utils/posts";

/** Read a fresh dashboard snapshot without crashing on expired administrator access.
 * Returns: {object} Actual counts/recent posts or inline error.
 */
function readDashboard() {
  try {
    return { stats: getStats(), posts: listPosts().slice(0, 5), error: "" };
  } catch (error) {
    return { stats: null, posts: [], error: error.message };
  }
}

/** Render administrator counts, quick actions and confirmed recent-post deletion.
 * Returns: {JSX.Element} Bounded accent header and responsive local-data sections.
 */
export default function AdminDashboard() {
  const [data, setData] = useState(readDashboard);
  const [deleteError, setDeleteError] = useState("");

  /** Confirm before mutating and refresh both counts and newest-five membership.
   * Args: post {object} Selected current post.
   * Notes: Cancel and failed writes leave the displayed snapshot unchanged.
   */
  function remove(post) {
    setDeleteError("");
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`))
      return;
    try {
      deletePost(post.id);
      setData(readDashboard());
    } catch (error) {
      setDeleteError(error.message);
    }
  }

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-6 py-12">
      <header className="rounded-card bg-gradient-to-r from-secondary-600 to-primary-600 p-6 text-white sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em]">
          Your writing community
        </p>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl">
          Admin Dashboard
        </h1>
        <p className="mt-4 max-w-xl">
          Review the writing and accounts saved in this browser.
        </p>
      </header>
      {(data.error || deleteError) && (
        <p
          role="alert"
          className="mt-6 rounded-control bg-error-light p-4 text-error"
        >
          {deleteError || data.error}
        </p>
      )}
      {data.stats && (
        <dl
          aria-label="Activity counts"
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard
            label="Total Posts"
            value={data.stats.totalPosts}
            accent="posts"
          />
          <StatCard label="Total Users" value={data.stats.totalUsers} />
          <StatCard
            label="Total Admins"
            value={data.stats.totalAdmins}
            accent="secondary"
          />
          <StatCard
            label="Standard Writers"
            value={data.stats.standardWriters}
            accent="writers"
          />
        </dl>
      )}
      <nav
        aria-label="Quick actions"
        className="mt-8 flex flex-col gap-3 sm:flex-row"
      >
        <Link
          to="/write"
          className="rounded-control bg-primary-600 px-6 py-3 text-center font-semibold text-white hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Write New Post
        </Link>
        <Link
          to="/users"
          className="rounded-control border border-primary-200 bg-surface px-6 py-3 text-center font-semibold text-primary-700 hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring"
        >
          Manage Users
        </Link>
      </nav>
      <section aria-labelledby="recent-posts" className="mt-12">
        <h2 id="recent-posts" className="font-display text-3xl">
          Latest Posts
        </h2>
        {!data.posts.length ? (
          <p className="mt-6 rounded-card border border-border bg-surface p-6 text-foreground-muted">
            No posts yet. Write the first post.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-border rounded-card border border-border bg-surface">
            {data.posts.map((post) => (
              <li
                key={post.id}
                className="flex min-w-0 flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    to={`/blog/${post.id}`}
                    className="break-words text-lg font-semibold text-primary-700 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-2 break-words text-sm text-foreground-muted">
                    {post.authorName} · {formatPostDate(post.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3">
                  <Link
                    to={`/edit/${post.id}`}
                    aria-label={`Edit ${post.title}`}
                    className="rounded-control border border-primary-200 px-4 py-3 font-semibold text-primary-700 hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete ${post.title}`}
                    onClick={() => remove(post)}
                    className="rounded-control border border-red-200 bg-error-light px-4 py-3 font-semibold text-error hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-10 max-w-2xl text-sm leading-relaxed text-warning">
        Local demo only. Credentials are plaintext and browser-side guards are
        not production security. Never store real passwords or sensitive data.
      </p>
    </main>
  );
}
