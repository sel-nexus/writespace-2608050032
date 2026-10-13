/** Create and remove browser-local demo accounts through trusted admin operations. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { UserRow } from "../components/UserRow";
import { getSession } from "../utils/auth";
import {
  listUsers,
  validateUser,
  createUser,
  deleteUser,
} from "../utils/users";
const emptyFields = { displayName: "", username: "", password: "", role: "" };
const labels = {
  displayName: "Display Name",
  username: "Username",
  password: "Password",
  role: "Role",
};

/** Load current accounts with inline feedback if administrator access expired.
 * Returns: {object} Current accounts and readable failure.
 */
function readAccounts() {
  try {
    return { users: listUsers(), error: "" };
  } catch (error) {
    return { users: [], error: error.message };
  }
}

/** Render accessible account creation and semantic desktop/mobile account lists.
 * Returns: {JSX.Element} Required form, live feedback and protected delete controls.
 */
export default function UserManagement() {
  const [data, setData] = useState(readAccounts);
  const [fields, setFields] = useState(emptyFields);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const currentId = getSession()?.userId || "";

  /** Preserve editable input and clear stale feedback for the changed field.
   * Args: event {Event} Native input change.
   */
  function change(event) {
    const { name, value } = event.target;
    setFields({ ...fields, [name]: value });
    setErrors({ ...errors, [name]: undefined });
    setSuccess("");
    setError("");
  }

  /** Validate all fields, persist the account, and only then clear the form.
   * Args: event {Event} Native submit.
   * Notes: Keep draft and accounts unchanged on validation or persistence failure.
   */
  function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const nextErrors = validateUser(fields);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) return;
      const account = createUser(fields);
      setData(readAccounts());
      setFields(emptyFields);
      setSuccess(
        `Created ${account.displayName} as ${account.role === "admin" ? "Admin" : "user"}.`,
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  /** Confirm eligible deletion and reread current storage after a successful write.
   * Args: id {string} Selected account identifier.
   */
  function remove(id) {
    setError("");
    setSuccess("");
    const account = data.users.find((user) => user.id === id);
    if (
      !window.confirm(
        `Delete account "${account?.username}"? Their posts will be retained.`,
      )
    )
      return;
    try {
      deleteUser(id);
      setData(readAccounts());
      setSuccess(
        "Account deleted. Existing posts and attribution were retained.",
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-6 py-12">
      <Link
        to="/admin"
        className="rounded-control text-primary-700 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        Back to Dashboard
      </Link>
      <h1 className="mt-5 font-display text-4xl sm:text-5xl">
        User Management
      </h1>
      <p className="mt-4 max-w-2xl text-foreground-muted">
        Manage access in this browser. Deleting an account keeps its writing and
        attribution.
      </p>
      <section
        aria-labelledby="create-user"
        className="mt-10 rounded-card border border-border bg-surface p-6 sm:p-8"
      >
        <h2 id="create-user" className="font-display text-2xl">
          Create User
        </h2>
        <p id="demo-warning" className="mt-3 text-sm text-warning">
          Demo only: passwords are stored as plaintext. Never use real passwords
          or sensitive data.
        </p>
        <form
          noValidate
          onSubmit={submit}
          aria-describedby="demo-warning"
          className="mt-6 grid gap-5 sm:grid-cols-2"
        >
          {Object.entries(labels).map(([name, label]) => (
            <div key={name}>
              <label
                htmlFor={`user-${name}`}
                className="mb-2 block font-semibold"
              >
                {label}
              </label>
              {name === "role" ? (
                <select
                  id={`user-${name}`}
                  name={name}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={
                    errors[name] ? `user-${name}-error` : undefined
                  }
                  value={fields[name]}
                  onChange={change}
                  className="w-full rounded-control border border-border bg-surface px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Choose role</option>
                  <option value="admin">Admin</option>
                  <option value="user">user</option>
                </select>
              ) : (
                <input
                  id={`user-${name}`}
                  name={name}
                  type={name === "password" ? "password" : "text"}
                  autoComplete={name === "password" ? "new-password" : "off"}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={
                    errors[name] ? `user-${name}-error` : undefined
                  }
                  value={fields[name]}
                  onChange={change}
                  className="w-full rounded-control border border-border bg-surface px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
              {errors[name] && (
                <p
                  id={`user-${name}-error`}
                  role="alert"
                  className="mt-2 text-error"
                >
                  {errors[name]}
                </p>
              )}
            </div>
          ))}
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full rounded-control bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
            >
              Create User
            </button>
          </div>
        </form>
      </section>
      {(error || data.error) && (
        <p
          role="alert"
          className="mt-6 rounded-control bg-error-light p-4 text-error"
        >
          {error || data.error}
        </p>
      )}
      <p role="status" aria-live="polite" className="mt-4 text-success">
        {success}
      </p>
      <section aria-labelledby="accounts" className="mt-10">
        <h2 id="accounts" className="font-display text-3xl">
          Accounts
        </h2>
        {data.users.length === 1 && (
          <p className="mt-4 text-foreground-muted">
            No additional accounts yet. Create your first writer or admin above.
          </p>
        )}
        <div className="mt-6 hidden overflow-x-auto rounded-card border border-border bg-surface sm:block">
          <table className="w-full text-left" aria-label="User accounts">
            <thead className="bg-background text-sm text-foreground-muted">
              <tr>
                {[
                  "Avatar",
                  "Display Name",
                  "Username",
                  "Role",
                  "Created Date",
                  "Action",
                ].map((label) => (
                  <th key={label} scope="col" className="p-4 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  currentId={currentId}
                  onDelete={remove}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div
          aria-label="Mobile user accounts"
          className="mt-6 grid gap-4 sm:hidden"
        >
          {data.users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              currentId={currentId}
              onDelete={remove}
              mobile
            />
          ))}
        </div>
      </section>
    </main>
  );
}
