/** Fail closed on protected routes using current account-derived identity. */
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { getSession } from "../utils/auth";

/** Render permitted content or replace the unauthorized route.
 * Args: children {React.Node} Protected content. adminOnly {boolean} Require administrator role.
 * Returns: {React.Node} Children, login redirect, or writer-home redirect.
 * Notes: Caller identity props are not an authorization source.
 */
export function ProtectedRoute({ children, adminOnly = false }) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  if (adminOnly && session.role !== "admin") {
    return <Navigate to="/blogs" replace />;
  }
  return children;
}
ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  adminOnly: PropTypes.bool,
};
