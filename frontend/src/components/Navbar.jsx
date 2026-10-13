/** Provide the single responsive header for authenticated workspaces. */
import { useState } from "react";
import PropTypes from "prop-types";
import { Link, NavLink } from "react-router-dom";
import { getAvatar } from "./Avatar";

/** Render role links and state-controlled navigation/account disclosures.
 * Args: session {object} Trusted display identity. onLogout {Function} App-owned persistence action.
 * Returns: {JSX.Element} Sticky workspace navigation.
 */
export function Navbar({ session, onLogout }) {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const links = [
    ["/blogs", "All Blogs"],
    ["/write", "Write"],
  ];
  if (session.role === "admin") links.push(["/users", "Users"]);

  /** Close disclosures after navigating away from the current page. */
  function close() {
    setOpen(false);
    setAccountOpen(false);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link
          to="/"
          onClick={close}
          className="flex items-center gap-3 rounded-control focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-control bg-primary-600 font-display text-2xl text-white"
          >
            W
          </span>
          <span className="font-display text-2xl font-bold tracking-tight">
            WriteSpace
          </span>
        </Link>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="workspace-navigation"
          onClick={() => setOpen(!open)}
          className="rounded-control p-3 hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-6 w-6"
          >
            <path
              d={open ? "M6 6l12 12M6 18L18 6" : "M3 6h18M3 12h18M3 18h18"}
            />
          </svg>
        </button>
        <nav
          id="workspace-navigation"
          aria-label="Workspace navigation"
          className={`${open ? "flex" : "hidden"} order-last w-full flex-col gap-2 sm:order-none sm:flex sm:w-auto sm:flex-row`}
        >
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              onClick={close}
              className={({ isActive }) =>
                `rounded-full px-4 py-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "bg-primary-600 text-white" : "text-primary-700 hover:bg-surface-raised"}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div
          className="relative sm:ml-auto"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setAccountOpen(false);
              event.currentTarget.querySelector("button").focus();
            }
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setAccountOpen(false);
          }}
        >
          <button
            type="button"
            aria-label={`Account options for ${session.displayName}`}
            aria-expanded={accountOpen}
            aria-controls="account-actions"
            onClick={() => setAccountOpen(!accountOpen)}
            className="flex items-center gap-2 rounded-full p-2 text-sm font-semibold hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring"
          >
            {getAvatar(session.role)}
            <span className="max-w-32 break-words">{session.displayName}</span>
            <span aria-hidden="true">▾</span>
          </button>
          {accountOpen && (
            <div
              id="account-actions"
              className="absolute right-0 mt-2 min-w-40 rounded-control border border-border bg-surface p-2 shadow-lg"
            >
              <button
                type="button"
                onClick={onLogout}
                className="w-full rounded-control px-4 py-3 text-left font-semibold text-primary-700 hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
Navbar.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf(["admin", "user"]).isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};
