/** Share account details between semantic desktop rows and mobile cards. */
import PropTypes from "prop-types";
import { getAvatar } from "./Avatar";
import { ADMIN_ID } from "../utils/auth";
import { formatPostDate } from "../utils/posts";

/** Render an account in the requested valid parent structure.
 * Args: user {object} Account. currentId {string} Current identity. onDelete {Function} Confirming handler. mobile {boolean} Card mode.
 * Returns: {JSX.Element} A table row or standalone article, never a row inside a div.
 */
export function UserRow({ user, currentId, onDelete, mobile = false }) {
  const reason =
    user.id === ADMIN_ID
      ? "Default admin cannot be deleted."
      : user.id === currentId
        ? "Current account cannot be deleted."
        : "";
  const date =
    user.id === ADMIN_ID ? "Permanent" : formatPostDate(user.createdAt);
  const badge = (
    <span
      className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${user.role === "admin" ? "bg-secondary-100 text-secondary-700" : "bg-primary-100 text-primary-700"}`}
    >
      {user.role === "admin" ? "Admin" : "user"}
    </span>
  );
  const action = (
    <span title={reason || undefined}>
      <button
        type="button"
        disabled={Boolean(reason)}
        title={reason || undefined}
        aria-label={`Delete ${user.username}`}
        onClick={() => onDelete(user.id)}
        className="rounded-control border border-red-200 bg-error-light px-4 py-3 font-semibold text-error hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        Delete
      </button>
    </span>
  );
  if (mobile) {
    return (
      <article
        aria-label={`Account ${user.username}`}
        className="min-w-0 rounded-card border border-border bg-surface p-5"
      >
        <div className="flex items-center gap-3">
          {getAvatar(user.role)}
          <h3 className="min-w-0 break-words font-semibold">
            {user.displayName}
          </h3>
        </div>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-sm text-foreground-muted">Username</dt>
            <dd className="break-words">{user.username}</dd>
          </div>
          <div>
            <dt className="text-sm text-foreground-muted">Role</dt>
            <dd>{badge}</dd>
          </div>
          <div>
            <dt className="text-sm text-foreground-muted">Created Date</dt>
            <dd>{date}</dd>
          </div>
        </dl>
        <div className="mt-5">{action}</div>
      </article>
    );
  }
  return (
    <tr className="border-t border-border">
      <td className="p-4">{getAvatar(user.role)}</td>
      <th
        scope="row"
        className="max-w-52 break-words p-4 text-left font-semibold"
      >
        {user.displayName}
      </th>
      <td className="max-w-44 break-words p-4">{user.username}</td>
      <td className="p-4">{badge}</td>
      <td className="p-4 text-sm text-foreground-muted">{date}</td>
      <td className="p-4">{action}</td>
    </tr>
  );
}
UserRow.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    role: PropTypes.oneOf(["admin", "user"]).isRequired,
    createdAt: PropTypes.string,
  }).isRequired,
  currentId: PropTypes.string.isRequired,
  onDelete: PropTypes.func.isRequired,
  mobile: PropTypes.bool,
};
