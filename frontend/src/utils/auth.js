/** Establish demo-only identity from current accounts, not untrusted session claims. */
import { ADMIN_ID, getUsers, saveUsers, isRequiredString } from './storage';
export { ADMIN_ID } from './storage';
export const DEFAULT_ADMIN = Object.freeze({ id: ADMIN_ID, username: 'admin', password: 'admin', displayName: 'Admin', role: 'admin' });
const SESSION_KEY = 'writespace_session';

/** Derive a password-free session from an account.
 * Args: account {object} Trusted current account.
 * Returns: {object} Persistable identity.
 */
function accountSession(account) {
  return { userId: account.id, username: account.username, displayName: account.displayName, role: account.role };
}

/** Resolve a session against the current account and ignore saved role/name claims.
 * Args: value {*} Untrusted session.
 * Returns: {object|null} Trusted identity or null.
 */
function trustedSession(value) {
  if (!value || !isRequiredString(value.userId) || !isRequiredString(value.username) ||
      !isRequiredString(value.displayName) || !['user', 'admin'].includes(value.role)) return null;
  const account = value.userId === ADMIN_ID ? DEFAULT_ADMIN : getUsers().find((user) => user.id === value.userId);
  return account && account.username === value.username ? accountSession(account) : null;
}

/** Read identity fail-closed and best-effort remove stale or malformed sessions.
 * Returns: {object|null} Identity derived from the current account.
 * Notes: Never raises on a read or invalid-session cleanup failure.
 */
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw === null) return null;
    const session = trustedSession(JSON.parse(raw));
    if (!session) {
      try { localStorage.removeItem(SESSION_KEY); } catch { /* Reads remain fail-closed when cleanup is blocked. */ }
    }
    return session;
  } catch {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* Unavailable storage has no usable identity. */ }
    return null;
  }
}

/** Persist a validated identity; do not report success on storage failure.
 * Args: value {object} Candidate session.
 * Returns: {object} Trusted saved identity.
 * Raises: {Error} Invalid identity or unavailable storage.
 */
export function setSession(value) {
  const session = trustedSession(value);
  if (!session) throw new Error('Cannot sign in with an invalid account. Please log in again.');
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
  catch { throw new Error('Unable to save your session. Enable browser storage and make space, then try again.'); }
  return session;
}

/** Remove persisted identity.
 * Raises: {Error} When storage prevents logout, so the UI can report it.
 */
export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); }
  catch { throw new Error('Unable to log out. Enable browser storage, then try again.'); }
}

/** Select the role's entry route. Args: session {object} Identity. Returns: {string} Home route. */
export function getRoleHome(session) { return session.role === 'admin' ? '/admin' : '/blogs'; }

/** Authenticate required strings, checking the permanent admin first.
 * Args: username {string} Exact account username. password {string} Exact plaintext demo password.
 * Returns: {object} Persisted trusted session.
 * Raises: {Error} Missing fields, invalid credentials, or failed session persistence.
 */
export function login(username, password) {
  if (!isRequiredString(username) || !isRequiredString(password)) throw new Error('Username and password are required.');
  const account = username === 'admin' && password === 'admin' ? DEFAULT_ADMIN :
    getUsers().find((user) => user.username === username && user.password === password);
  if (!account) throw new Error('Invalid username or password.');
  return setSession(accountSession(account));
}

/** Create a standard writer and session, rolling back the account if session saving fails.
 * Args: fields {object} Display name, username, password, confirmPassword strings.
 * Returns: {object} Persisted trusted writer session.
 * Raises: {Error} Invalid fields, duplicate username, unavailable UUIDs, or failed storage.
 * Notes: Username uniqueness is exact and case-sensitive; surrounding whitespace is trimmed.
 */
export function register(fields) {
  const { displayName, username, password, confirmPassword } = fields || {};
  if (![displayName, username, password, confirmPassword].every(isRequiredString)) throw new Error('All fields are required.');
  if (password !== confirmPassword) throw new Error('Passwords must match.');
  const users = getUsers();
  const cleanUsername = username.trim();
  if (cleanUsername === 'admin' || users.some((user) => user.username === cleanUsername)) throw new Error('Username is already taken.');
  if (typeof globalThis.crypto?.randomUUID !== 'function') throw new Error('This browser cannot create an account. Use a current browser on HTTPS or localhost.');
  const account = { id: crypto.randomUUID(), displayName: displayName.trim(), username: cleanUsername, password, role: 'user', createdAt: new Date().toISOString() };
  saveUsers([...users, account]);
  try { return setSession(accountSession(account)); }
  catch (error) {
    try { saveUsers(users); }
    catch { throw new Error(`${error.message} Your account was saved; use Login after restoring storage.`); }
    throw error;
  }
}
