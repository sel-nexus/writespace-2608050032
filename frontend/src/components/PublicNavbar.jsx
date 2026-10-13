/** Render responsive guest or signed-in entry navigation without global context. */
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import PropTypes from "prop-types";
import { getRoleHome } from "../utils/auth";

/** Show account entry links and a state-controlled mobile menu.
 * Args: session {object|null} Current trusted identity.
 * Returns: {JSX.Element} Sticky public header.
 */
export function PublicNavbar({ session }) {
  const [open, setOpen] = useState(false);
  const linkClass =
    "rounded-full px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-surface-raised";
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between px-6 py-4">
        <Link
          to="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          className="rounded-control p-3 text-sm font-semibold hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          aria-expanded={open}
          aria-controls="public-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close menu" : "Open menu"}
        </button>
        <nav
          id="public-navigation"
          aria-label="Main navigation"
          className={`${open ? "flex" : "hidden"} mt-4 w-full flex-col gap-2 md:mt-0 md:flex md:w-auto md:flex-row md:items-center`}
        >
          {session ? (
            <>
              <span className="flex items-center gap-2 px-4 py-2 text-sm">
                <span
                  aria-hidden="true"
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-white ${session.role === "admin" ? "bg-secondary-600" : "bg-primary-500"}`}
                >
                  {session.role === "admin" ? "👑" : "📖"}
                </span>
                <span className="max-w-48 break-words">
                  {session.displayName}
                </span>
              </span>
              <Link
                to={getRoleHome(session)}
                className={`${linkClass} bg-primary-600 text-white hover:bg-primary-700`}
                onClick={() => setOpen(false)}
              >
                Go to Dashboard
              </Link>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={`${linkClass} bg-primary-600 text-white hover:bg-primary-700`}
                onClick={() => setOpen(false)}
              >
                Get Started
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
PublicNavbar.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string,
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf(["admin", "user"]).isRequired,
  }),
};
