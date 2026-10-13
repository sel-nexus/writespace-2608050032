/** Create browser-local writer accounts with visible per-field errors. */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { register } from "../utils/auth";
import { getUsers, isRequiredString } from "../utils/storage";
const fields = [
  ["displayName", "Display Name", "text", "nickname"],
  ["username", "Username", "text", "username"],
  ["password", "Password", "password", "new-password"],
  ["confirmPassword", "Confirm Password", "password", "new-password"],
];

/** Persist a writer and inform App only on full success.
 * Args: onSessionChange {Function} App identity setter.
 * Returns: {JSX.Element} Registration form.
 */
export default function RegisterPage({ onSessionChange }) {
  const [values, setValues] = useState({
    displayName: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const navigate = useNavigate();
  /** Validate fields before calling the separately validated registration business method. */
  function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    fields.forEach(([key, label]) => {
      if (!isRequiredString(values[key])) next[key] = `${label} is required.`;
    });
    if (!next.confirmPassword && values.password !== values.confirmPassword)
      next.confirmPassword = "Passwords must match.";
    if (
      !next.username &&
      (values.username.trim() === "admin" ||
        getUsers().some((user) => user.username === values.username.trim()))
    )
      next.username = "Username is already taken.";
    setErrors(next);
    setError("");
    if (Object.keys(next).length) return;
    try {
      const session = register(values);
      onSessionChange(session);
      navigate("/blogs", { replace: true });
    } catch (failure) {
      setError(failure.message);
    }
  }
  return (
    <main
      id="main-content"
      className="mx-auto grid min-h-[calc(100svh-80px)] max-w-6xl items-center gap-12 px-6 py-14 lg:grid-cols-2"
    >
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
          Make room for your voice
        </p>
        <h1 className="mt-5 font-display text-5xl leading-tight sm:text-6xl">
          A new chapter
          <br />
          starts here.
        </h1>
        <p className="mt-6 max-w-sm text-lg leading-relaxed text-foreground-muted">
          Choose a name, claim your space, and join this local writing demo.
          Your account lives only in this browser.
        </p>
      </section>
      <section
        aria-labelledby="register-heading"
        className="w-full max-w-lg rounded-card border border-border bg-surface p-7 shadow-editorial sm:p-10"
      >
        <p className="font-display text-xl text-primary-700">WriteSpace</p>
        <h2 id="register-heading" className="mt-5 font-display text-3xl">
          Create your account
        </h2>
        <form noValidate onSubmit={handleSubmit} className="mt-8 space-y-5">
          {fields.map(([key, label, type, autoComplete]) => (
            <div key={key}>
              <label htmlFor={key} className="text-sm font-semibold">
                {label}
              </label>
              <input
                id={key}
                name={key}
                type={type}
                autoComplete={autoComplete}
                required
                aria-required="true"
                aria-invalid={!!errors[key]}
                aria-describedby={errors[key] ? `${key}-error` : undefined}
                value={values[key]}
                onChange={(event) =>
                  setValues({ ...values, [key]: event.target.value })
                }
                className="mt-2 min-h-12 w-full rounded-control border border-border bg-surface px-4 text-foreground focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors[key] && (
                <p
                  id={`${key}-error`}
                  role="alert"
                  className="mt-2 text-sm text-error"
                >
                  {errors[key]}
                </p>
              )}
            </div>
          ))}
          {error && (
            <p
              role="alert"
              className="rounded-control bg-error-light p-4 text-sm text-error"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            className="min-h-12 w-full rounded-control bg-primary-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            Register
          </button>
        </form>
        <p className="mt-6 text-sm text-foreground-muted">
          Already have a space?{" "}
          <Link
            to="/login"
            className="rounded-control font-semibold text-primary-700 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Login
          </Link>
        </p>
        <aside className="mt-8 border-t border-border pt-5 text-sm leading-relaxed text-warning">
          <strong>Local demo only.</strong> Passwords are saved as plaintext. Do
          not use a real password or sensitive data. Accounts are not shared
          across browsers.
        </aside>
      </section>
    </main>
  );
}
RegisterPage.propTypes = { onSessionChange: PropTypes.func.isRequired };
