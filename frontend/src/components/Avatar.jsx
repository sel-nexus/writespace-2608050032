/** Share role-colored author and account identification without uploaded images. */
import { ADMIN_ID } from "../utils/auth";
import { getUsers } from "../utils/storage";

/** Render the PRD's static role glyph.
 * Args: role {string} Account role; unknown roles use the writer appearance.
 * Returns: {JSX.Element} Decorative circular avatar beside visible author text.
 */
export function getAvatar(role) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
        role === "admin" ? "bg-violet-600" : "bg-indigo-500"
      }`}
    >
      {role === "admin" ? "👑" : "📚"}
    </span>
  );
}

/** Resolve authorship against actual accounts, with a safe retained-post fallback.
 * Args: authorId {*} Stored author identifier.
 * Returns: {string} Admin for a permanent/current administrator, otherwise user.
 */
export function getAuthorRole(authorId) {
  if (authorId === ADMIN_ID) return "admin";
  return getUsers().find((user) => user.id === authorId)?.role === "admin"
    ? "admin"
    : "user";
}
