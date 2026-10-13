/** Read validated browser-local entities and report failed writes without false success. */
export const ADMIN_ID = 'admin';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** Check a required string without coercing arbitrary values.
 * Args: value {*} Candidate field.
 * Returns: {boolean} Whether the field contains non-whitespace text.
 */
export function isRequiredString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Check an ISO timestamp by round-tripping it to reject impossible dates.
 * Args: value {*} Candidate timestamp.
 * Returns: {boolean} Whether it is a canonical ISO timestamp.
 */
function isTimestamp(value) {
  return typeof value === 'string' && isoPattern.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

/** Check all account fields at the storage boundary.
 * Args: user {*} Candidate account.
 * Returns: {boolean} Whether it follows the stored account schema.
 */
function isUser(user) {
  return !!user && typeof user.id === 'string' && uuidPattern.test(user.id) &&
    isRequiredString(user.displayName) && isRequiredString(user.username) &&
    user.username !== 'admin' && isRequiredString(user.password) &&
    ['admin', 'user'].includes(user.role) && isTimestamp(user.createdAt);
}

/** Check all post fields, allowing the special default administrator author.
 * Args: post {*} Candidate post.
 * Returns: {boolean} Whether it follows the stored post schema.
 */
function isPost(post) {
  return !!post && typeof post.id === 'string' && uuidPattern.test(post.id) &&
    isRequiredString(post.title) && isRequiredString(post.content) &&
    isTimestamp(post.createdAt) && typeof post.authorId === 'string' &&
    (post.authorId === ADMIN_ID || uuidPattern.test(post.authorId)) &&
    isRequiredString(post.authorName);
}

/** Validate the complete collection, including duplicate identifiers and usernames.
 * Args: value {*} Candidate array. validate {Function} Entity validator. users {boolean} Account mode.
 * Returns: {boolean} Whether every entity and unique key is valid.
 */
function isCollection(value, validate, users = false) {
  return Array.isArray(value) && value.every(validate) &&
    new Set(value.map((item) => item.id)).size === value.length &&
    (!users || new Set(value.map((item) => item.username)).size === value.length);
}

/** Read a collection without crashing on corrupt or inaccessible storage.
 * Args: key {string} Storage key. validate {Function} Entity validator. users {boolean} Account mode.
 * Returns: {Array} Valid records or an empty fallback.
 */
function readCollection(key, validate, users = false) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return isCollection(value, validate, users) ? value : [];
  } catch {
    return [];
  }
}

/** Persist only a valid collection and expose actionable write errors.
 * Args: key {string} Storage key. value {Array} Records. validate {Function} Entity validator. users {boolean} Account mode.
 * Raises: {Error} Invalid data or unavailable browser storage.
 */
function writeCollection(key, value, validate, users = false) {
  if (!isCollection(value, validate, users)) {
    throw new Error('Cannot save invalid data. Check every required field.');
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error('Unable to save data. Enable browser storage and make space, then try again.');
  }
}

/** Return validated posts or an empty collection. Returns: {Array} Stored posts. */
export function getPosts() { return readCollection('writespace_posts', isPost); }
/** Persist posts. Args: arr {Array} Valid posts. Raises: {Error} A readable write error. */
export function savePosts(arr) { writeCollection('writespace_posts', arr, isPost); }
/** Return validated accounts or an empty collection. Returns: {Array} Stored accounts. */
export function getUsers() { return readCollection('writespace_users', isUser, true); }
/** Persist accounts. Args: arr {Array} Valid accounts. Raises: {Error} A readable write error. */
export function saveUsers(arr) { writeCollection('writespace_users', arr, isUser, true); }
