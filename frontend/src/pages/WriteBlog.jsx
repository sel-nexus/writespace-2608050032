/** Publish required plain text and expose validation and persistence feedback inline. */
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  canManagePost,
  createPost,
  findPost,
  updatePost,
} from "../utils/posts";
import { isRequiredString } from "../utils/storage";

/** Render creation or prefilled editing; cancel never writes a post.
 * Returns: {JSX.Element} Accessible title/content controls and submission feedback.
 */
export default function WriteBlog() {
  const { id } = useParams();
  const editing = id !== undefined;
  const original = editing ? findPost(id) : null;
  const [title, setTitle] = useState(original?.title || "");
  const [content, setContent] = useState(original?.content || "");
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const navigate = useNavigate();

  /** Validate each required field before invoking trusted-session persistence.
   * Args: event {Event} Form submission.
   * Notes: Keep entered text and route unchanged on failure.
   */
  function submit(event) {
    event.preventDefault();
    setSaveError("");
    const nextErrors = {};
    if (!isRequiredString(title)) nextErrors.title = "Title is required.";
    if (!isRequiredString(content)) nextErrors.content = "Content is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      const post = editing
        ? updatePost(id, { title, content })
        : createPost({ title, content });
      navigate(`/blog/${post.id}`);
    } catch (error) {
      setSaveError(error.message);
    }
  }

  if (editing && !original) {
    return (
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-12 sm:py-20">
        <h1 className="font-display text-4xl">Post not found</h1>
        <Link
          to="/blogs"
          className="mt-8 inline-block rounded-control px-4 py-3 text-primary-700 focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to All Posts
        </Link>
      </main>
    );
  }
  if (editing && !saveError && !canManagePost(original))
    return <Navigate to="/blogs" replace />;

  return (
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-12 sm:py-20">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
        A space for your words
      </p>
      <h1 className="mt-4 font-display text-4xl sm:text-5xl">
        {editing ? "Edit post" : "Write a post"}
      </h1>
      <p className="mt-4 text-foreground-muted">
        Plain text, just as you write it. Saved only in this browser.
      </p>
      <form noValidate onSubmit={submit} className="mt-10 space-y-6">
        <div>
          <label htmlFor="title" className="mb-2 block font-semibold">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            aria-required="true"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : undefined}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-control border border-border bg-surface px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.title && (
            <p id="title-error" role="alert" className="mt-2 text-error">
              {errors.title}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="content" className="mb-2 block font-semibold">
            Content
          </label>
          <textarea
            id="content"
            name="content"
            required
            aria-required="true"
            aria-invalid={Boolean(errors.content)}
            aria-describedby={
              errors.content ? "content-error content-count" : "content-count"
            }
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-[256px] w-full resize-y rounded-control border border-border bg-surface px-4 py-3 leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.content && (
            <p id="content-error" role="alert" className="mt-2 text-error">
              {errors.content}
            </p>
          )}
          <p
            id="content-count"
            className="mt-2 text-sm tabular-nums text-foreground-muted"
          >
            {content.length} characters
          </p>
        </div>
        {saveError && (
          <p
            role="alert"
            className="rounded-control bg-error-light p-4 text-error"
          >
            {saveError}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="rounded-control bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Save
          </button>
          <Link
            to={editing ? `/blog/${id}` : "/blogs"}
            className="rounded-control px-6 py-3 text-center font-semibold text-foreground-muted hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
