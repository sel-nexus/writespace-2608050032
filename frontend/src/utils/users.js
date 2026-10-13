/** Administer browser-local demo accounts without trusting caller identity claims. */
import { ADMIN_ID, DEFAULT_ADMIN, getSession } from "./auth";
import { getUsers, saveUsers, isRequiredString } from "./storage";
import { listPosts } from "./posts";

/** Require the actual current administrator on every operation.
 * Returns: {object} Trusted current session.
 * Raises: {Error} Missing, stale or non-admin identity.
 */
function requireAdmin() {
  const session = getSession();
  if (!session || session.role !== "admin")
    throw new Error(
      "Administrator access is required. Please log in as an admin.",
    );
  return session;
}

/** List all current accounts including the permanent administrator.
 * Returns: {Array} Fresh account records; default createdAt is null, displayed as Permanent.
 * Raises: {Error} Missing administrator access.
 * Notes: The permanent identity is never persisted in writespace_users.
 */
export function listUsers() {
  requireAdmin();
  return [{ ...DEFAULT_ADMIN, createdAt: null }, ...getUsers()];
}

/** Validate required fields and exact case-sensitive trimmed username uniqueness.
 * Args: fields {object} Candidate displayName, username, password and role.
 * Returns: {object} Field-keyed error messages.
 * Raises: {Error} Missing administrator access.
 */
export function validateUser(fields) {
  requireAdmin();
  const { displayName, username, password, role } = fields || {};
  const errors = {};
  if (!isRequiredString(displayName))
    errors.displayName = "Display Name is required.";
  if (!isRequiredString(username)) errors.username = "Username is required.";
  else if (
    username.trim() === "admin" ||
    getUsers().some((user) => user.username === username.trim())
  )
    errors.username = "Username is already taken.";
  if (!isRequiredString(password)) errors.password = "Password is required.";
  if (!["admin", "user"].includes(role)) errors.role = "Choose Admin or user.";
  return errors;
}

/** Persist a validated account without changing the administrator's session.
 * Args: fields {object} Required demo account fields; identity claims are ignored.
 * Returns: {object} Saved UUID account with ISO creation time and plaintext demo password.
 * Raises: {Error} Authorization, validation, UUID or storage failure.
 */
export function createUser(fields) {
  requireAdmin();
  const errors = validateUser(fields);
  if (Object.keys(errors).length)
    throw new Error(Object.values(errors).join(" "));
  if (typeof globalThis.crypto?.randomUUID !== "function")
    throw new Error(
      "This browser cannot create an account. Use a current browser on HTTPS or localhost.",
    );
  const account = {
    id: globalThis.crypto.randomUUID(),
    displayName: fields.displayName.trim(),
    username: fields.username.trim(),
    password: fields.password,
    role: fields.role,
    createdAt: new Date().toISOString(),
  };
  saveUsers([...getUsers(), account]);
  return account;
}

/** Remove an eligible current account while retaining all posts and attribution.
 * Args: id {*} Exact account identifier.
 * Raises: {Error} Authorization, protected identity, missing account or failed write.
 * Notes: UI owns confirmation; reread identity and accounts at mutation time.
 */
export function deleteUser(id) {
  const session = requireAdmin();
  if (id === ADMIN_ID) throw new Error("Default admin cannot be deleted.");
  if (id === session.userId)
    throw new Error("Current account cannot be deleted.");
  const users = getUsers();
  if (!isRequiredString(id) || !users.some((user) => user.id === id))
    throw new Error("User not found.");
  saveUsers(users.filter((user) => user.id !== id));
}

/** Count actual posts and all current accounts including the permanent admin.
 * Returns: {object} totalPosts, totalUsers, totalAdmins and standardWriters counts.
 * Raises: {Error} Missing administrator access.
 */
export function getStats() {
  const users = listUsers();
  return {
    totalPosts: listPosts().length,
    totalUsers: users.length,
    totalAdmins: users.filter((user) => user.role === "admin").length,
    standardWriters: users.filter((user) => user.role === "user").length,
  };
}
