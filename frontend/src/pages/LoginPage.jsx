/** Provide local demo sign-in with associated validation and persistence errors. */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { login, getRoleHome } from "../utils/auth";
import { isRequiredString } from "../utils/storage";

/** Sign in and synchronize App only after storage succeeds.
 * Args: onSessionChange {Function} App identity setter.
 * Returns: {JSX.Element} Login form.
 */
export default function LoginPage({ onSessionChange }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const navigate = useNavigate();
  /** Validate submitted fields and show business errors without leaving the form. */
  function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!isRequiredString(username)) next.username = "Username is required.";
    if (!isRequiredString(password)) next.password = "Password is required.";
    setErrors(next);
    setError("");
    if (Object.keys(next).length) return;
    try {
      const session = login(username, password);
      onSessionChange(session);
      navigate(getRoleHome(session), { replace: true });
    } catch (failure) {
      setError(failure.message);
    }
  }
  const inputClass =
    "mt-2 min-h-12 w-full rounded-control border border-border bg-surface px-4 text-foreground focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-ring";
  return (
    <main
      id="main-content"
      className="mx-auto grid min-h-[calc(100svh-80px)] max-w-6xl items-center gap-12 px-6 py-14 lg:grid-cols-2"
    >
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
          Back to your space
        </p>
        <h1 className="mt-5 font-display text-5xl leading-tight sm:text-6xl">
          Good to see
          <br />
          you again.
        </h1>
        <p className="mt-6 max-w-sm text-lg leading-relaxed text-foreground-muted">
          Your next thought deserves a place on the page. Sign in to your
          browser-local writing space.
        </p>
      </section>
      <section
        aria-labelledby="login-heading"
        className="w-full max-w-lg rounded-card border border-border bg-surface p-7 shadow-editorial sm:p-10"
      >
        <p className="font-display text-xl text-primary-700">WriteSpace</p>
        <h2 id="login-heading" className="mt-5 font-display text-3xl">
          Login
        </h2>
        <form noValidate onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="username" className="text-sm font-semibold">
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
              aria-required="true"
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? "username-error" : undefined}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className={inputClass}
            />
            {errors.username && (
              <p
                id="username-error"
                role="alert"
                className="mt-2 text-sm text-error"
              >
                {errors.username}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-semibold">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-required="true"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
            />
            {errors.password && (
              <p
                id="password-error"
                role="alert"
                className="mt-2 text-sm text-error"
              >
                {errors.password}
              </p>
            )}
          </div>
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
            Login
          </button>
        </form>
        <p className="mt-6 text-sm text-foreground-muted">
          New here?{" "}
          <Link
            to="/register"
            className="rounded-control font-semibold text-primary-700 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Register
          </Link>
        </p>
        <aside className="mt-8 border-t border-border pt-5 text-sm leading-relaxed text-warning">
          <strong>Demo administrator: admin / admin.</strong> Plaintext
          credentials stay in this browser. Never use real passwords or
          sensitive data.
        </aside>
      </section>
    </main>
  );
}
LoginPage.propTypes = { onSessionChange: PropTypes.func.isRequired };
