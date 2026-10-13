/** Introduce the local writing demo with live stored previews and an editorial hero. */
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { getPosts } from "../utils/storage";

/** Format a validated timestamp in local time. Args: value {string} ISO date. Returns: {string} English date. */
function displayDate(value) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/** Render public discovery; protected preview links are guarded by App.
 * Args: session {object|null} Trusted identity.
 * Returns: {JSX.Element} Landing content and footer.
 */
export default function LandingPage({ session }) {
  const posts = getPosts()
    .sort(
      (a, b) =>
        Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
        b.id.localeCompare(a.id),
    )
    .slice(0, 3);
  const preview = posts[0];
  const readingRoute = session ? "/blogs" : "/login";
  const action =
    "inline-flex min-h-12 items-center justify-center rounded-control px-6 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  return (
    <>
      <main id="main-content">
        <section className="mx-auto grid min-h-[calc(100svh-80px)] max-w-6xl items-center gap-14 px-6 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
              A little room for big ideas
            </p>
            <h1 className="font-display text-[clamp(3rem,7vw,5.75rem)] leading-[1.04] tracking-tight">
              Your thoughts.
              <br />
              Your space.
              <br />
              <span className="text-primary-600">WriteSpace.</span>
            </h1>
            <p className="mt-7 max-w-md text-xl leading-relaxed text-foreground-muted">
              Your thoughts. Your space. Beautifully simple.
            </p>
            <p className="mt-4 max-w-md leading-relaxed text-foreground-muted">
              A place to put words first. Discover recent writing and make a
              space for your own, right here in your browser.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to={readingRoute}
                className={`${action} bg-primary-600 text-white shadow-sm transition-colors hover:bg-primary-700 motion-reduce:transition-none`}
              >
                Start Reading
              </Link>
              <Link
                to="/register"
                className={`${action} border border-border bg-surface text-primary-700 hover:bg-surface-raised`}
              >
                Get Started Free
              </Link>
            </div>
            <p className="mt-6 text-sm text-foreground-muted">
              No server. No subscriptions. Just your words.
            </p>
          </div>
          <div className="relative rounded-card bg-primary-50 px-6 py-12 sm:px-10 lg:py-20">
            <p className="mb-7 text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
              {preview ? "From your local blog" : "The shape of a story"}
            </p>
            <article className="rounded-card border border-border bg-surface p-7 shadow-editorial motion-safe:animate-float sm:p-9">
              <div className="mb-7 flex items-center justify-between border-b border-border pb-4 text-xs text-foreground-muted">
                <span className="font-display text-lg font-bold text-foreground">
                  WriteSpace
                </span>
                <span>
                  {preview
                    ? displayDate(preview.createdAt)
                    : "A blank page, a fresh start"}
                </span>
              </div>
              <h2 className="break-words font-display text-3xl leading-tight">
                {preview ? preview.title : "Every story starts with a thought."}
              </h2>
              <p className="mt-5 break-words leading-7 text-foreground-muted">
                {preview
                  ? preview.content.slice(0, 240)
                  : "An observation on a morning walk. A lesson worth keeping. An idea that needs a little room to grow. Give it a place on the page."}
              </p>
              {preview ? (
                <Link
                  to={`/blog/${preview.id}`}
                  className="mt-7 inline-block rounded-control font-semibold text-primary-700 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Read this story
                </Link>
              ) : (
                <p className="mt-7 border-t border-border pt-4 text-xs uppercase tracking-widest text-foreground-muted">
                  Interface illustration · your words belong here
                </p>
              )}
            </article>
          </div>
        </section>
        <section
          aria-labelledby="features-title"
          className="border-y border-border bg-surface"
        >
          <div className="mx-auto max-w-6xl px-6 py-20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
              Less friction. More expression.
            </p>
            <h2 id="features-title" className="mt-4 font-display text-4xl">
              Made for the words that matter.
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                [
                  "01",
                  "Write Freely",
                  "Plain-text writing without distractions. Keep the focus on what you have to say.",
                ],
                [
                  "02",
                  "Private & Local",
                  "Your data lives in this browser, not on a shared server. Local does not mean encrypted or secure.",
                ],
                [
                  "03",
                  "Instant & Fast",
                  "No server round trips. Move from an idea to your writing space with simple, quick navigation.",
                ],
              ].map(([number, title, text]) => (
                <article key={title} className="rounded-card bg-background p-7">
                  <p className="font-display text-3xl text-primary-600">
                    {number}
                  </p>
                  <h3 className="mt-6 font-display text-2xl">{title}</h3>
                  <p className="mt-3 leading-relaxed text-foreground-muted">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          aria-labelledby="latest-title"
          className="mx-auto max-w-6xl px-6 py-20"
        >
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
                The local reading shelf
              </p>
              <h2 id="latest-title" className="mt-4 font-display text-4xl">
                Latest from the Blog
              </h2>
            </div>
            <Link
              to="/blogs"
              className="rounded-control py-3 font-semibold text-primary-700 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              All Blogs
            </Link>
          </div>
          {posts.length ? (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.id}`}
                  className="group rounded-card border border-border bg-surface p-7 transition-shadow hover:shadow-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                >
                  <article>
                    <p className="text-sm text-foreground-muted">
                      {displayDate(post.createdAt)}
                    </p>
                    <h3 className="mt-4 break-words font-display text-2xl group-hover:text-primary-700">
                      {post.title}
                    </h3>
                    <p className="mt-4 break-words leading-relaxed text-foreground-muted">
                      {post.content.slice(0, 120)}
                      {post.content.length > 120 ? "…" : ""}
                    </p>
                    <p className="mt-6 text-sm font-semibold text-primary-700">
                      Read story →
                    </p>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-10 border-l-2 border-primary-600 py-6 pl-6 text-lg text-foreground-muted">
              No posts yet — check back soon!
            </p>
          )}
          <aside className="mt-12 rounded-control border border-warning/20 bg-warning-light p-5 text-sm leading-relaxed text-warning">
            <strong>Local demo only.</strong> Accounts, posts, and plaintext
            passwords are stored in this browser. Do not use real passwords or
            sensitive data. Client-side access checks are not production
            security.
          </aside>
        </section>
      </main>
      <footer className="bg-neutral-800 text-white">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 px-6 py-12 md:flex-row">
          <div>
            <p className="font-display text-2xl">WriteSpace</p>
            <p className="mt-3 text-sm text-neutral-300">
              © {new Date().getFullYear()} WriteSpace. Your words, at home.
            </p>
          </div>
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-6 text-sm"
          >
            {["Home", "All Blogs", "Login", "Register"].map((label, index) => (
              <Link
                key={label}
                to={["/", "/blogs", "/login", "/register"][index]}
                className="rounded-control py-3 hover:underline focus-visible:ring-2 focus-visible:ring-white"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </>
  );
}
LandingPage.propTypes = {
  session: PropTypes.shape({ role: PropTypes.oneOf(["admin", "user"]) }),
};
