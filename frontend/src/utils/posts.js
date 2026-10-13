/** Create and discover browser-local plain-text posts using current trusted identity. */
import { getSession } from "./auth";
import { getPosts, savePosts, isRequiredString } from "./storage";
export { getPosts } from "./storage";

/** Convert a date to sortable milliseconds, putting invalid dates last.
 * Args: value {*} Candidate date string.
 * Returns: {number} Timestamp or negative infinity.
 */
export function postTimestamp(value) {
  if (!isRequiredString(value)) return -Infinity;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : -Infinity;
}

/** Sort a copy newest first and ascending by ID when dates tie.
 * Args: posts {Array} Post records.
 * Returns: {Array} Ordered records; invalid collections become empty.
 */
export function sortPosts(posts) {
  if (!Array.isArray(posts)) return [];
  return [...posts].sort((left, right) => {
    const leftDate = postTimestamp(left.createdAt);
    const rightDate = postTimestamp(right.createdAt);
    if (leftDate !== rightDate) return leftDate > rightDate ? -1 : 1;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
}

/** List all validated stored posts in reading order.
 * Returns: {Array} Newest-first posts.
 */
export function listPosts() {
  return sortPosts(getPosts());
}

/** Find a stored post by exact nonempty string identifier.
 * Args: id {*} Requested identifier.
 * Returns: {object|null} Matching post or null.
 */
export function findPost(id) {
  if (!isRequiredString(id)) return null;
  return getPosts().find((post) => post.id === id) || null;
}

/** Format an English local calendar date without throwing on invalid input.
 * Args: value {*} Date string.
 * Returns: {string} MMM DD, YYYY or Date unavailable.
 */
export function formatPostDate(value) {
  if (postTimestamp(value) === -Infinity) return "Date unavailable";
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part("month")} ${part("day")}, ${part("year")}`;
}

/** Publish required text using the actual session, ignoring caller identity claims.
 * Args: fields {object} Title and content strings; additional properties are ignored.
 * Returns: {object} Persisted post with UUID, creation date and trusted attribution.
 * Raises: {Error} Invalid fields, missing current identity, unavailable UUID or persistence failure.
 * Notes: Trim title only; preserve content including newlines and surrounding whitespace.
 */
export function createPost(fields) {
  const { title, content } = fields || {};
  if (!isRequiredString(title)) throw new Error("Title is required.");
  if (!isRequiredString(content)) throw new Error("Content is required.");
  const session = getSession();
  if (!session) throw new Error("Please log in again before publishing.");
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error(
      "This browser cannot create a post. Use a current browser on HTTPS or localhost.",
    );
  }
  const post = {
    id: globalThis.crypto.randomUUID(),
    title: title.trim(),
    content,
    createdAt: new Date().toISOString(),
    authorId: session.userId,
    authorName: session.displayName,
  };
  savePosts([...getPosts(), post]);
  return post;
}
