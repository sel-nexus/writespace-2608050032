/** Compose identity routes and synchronize browser-local sessions without Context. */
import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { PublicNavbar } from "./components/PublicNavbar";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Home from "./pages/Home";
import ReadBlog from "./pages/ReadBlog";
import WriteBlog from "./pages/WriteBlog";
import { clearSession, getRoleHome, getSession } from "./utils/auth";

/** Render identity and publishing routes with minimal authenticated navigation.
 * Returns: {JSX.Element} App routes, navigation, and inline logout feedback.
 * Notes: Editing and account-management surfaces remain temporary welcome routes.
 */
export default function App() {
  const [session, setSession] = useState(getSession);
  const [logoutError, setLogoutError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    /** Refresh account-derived identity after navigation or another tab's storage change. */
    function synchronize() {
      setSession(getSession());
    }
    synchronize();
    window.addEventListener("storage", synchronize);
    window.addEventListener("focus", synchronize);
    return () => {
      window.removeEventListener("storage", synchronize);
      window.removeEventListener("focus", synchronize);
    };
  }, [location.pathname]);

  /** Remove persisted identity before acknowledging logout; retain feedback on failure. */
  function logout() {
    setLogoutError("");
    try {
      clearSession();
      setSession(null);
      navigate("/", { replace: true });
    } catch (error) {
      setLogoutError(error.message);
    }
  }

  /** Guard the temporary welcome route without introducing permission-slice components. */
  function welcome(adminOnly = false) {
    if (!session) return <Navigate to="/login" replace />;
    if (adminOnly && session.role !== "admin")
      return <Navigate to="/blogs" replace />;
    return (
      <main
        id="main-content"
        className="mx-auto min-h-[calc(100svh-80px)] max-w-6xl px-6 py-20"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
          {session.role === "admin"
            ? "Administrator account"
            : "Writer account"}
        </p>
        <h1 className="mt-5 break-words font-display text-5xl">
          Welcome, {session.displayName}.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground-muted">
          You are signed in as {session.username}. Your account and session are
          saved in this browser.
        </p>
        <p className="mt-4 max-w-xl leading-relaxed text-foreground-muted">
          Reading and publishing are available from the public Home page.
          Editing and account-management tools are not available in this slice.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/"
            className="rounded-control border border-border bg-surface px-6 py-3 font-semibold text-primary-700 hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring"
          >
            Home
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-control bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Logout
          </button>
        </div>
        {logoutError && (
          <p
            role="alert"
            className="mt-6 rounded-control bg-error-light p-4 text-error"
          >
            {logoutError}
          </p>
        )}
        <p className="mt-12 max-w-xl text-sm leading-relaxed text-warning">
          Local demo only. Credentials are plaintext and browser-side guards are
          not production security. Never store real passwords or sensitive data.
        </p>
      </main>
    );
  }
  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary-100">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-control bg-surface p-4 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <PublicNavbar session={session} />
      {session &&
        ["/blogs", "/write"]
          .concat(
            location.pathname.startsWith("/blog/") ? [location.pathname] : [],
          )
          .includes(location.pathname) && (
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 border-b border-border px-6 py-4">
            <nav
              aria-label="Publishing navigation"
              className="flex flex-wrap gap-4"
            >
              <Link
                to="/"
                className="rounded-control px-3 py-2 text-primary-700 focus-visible:ring-2 focus-visible:ring-ring"
              >
                Home
              </Link>
              <Link
                to="/blogs"
                className="rounded-control px-3 py-2 text-primary-700 focus-visible:ring-2 focus-visible:ring-ring"
              >
                All Blogs
              </Link>
              <Link
                to="/write"
                className="rounded-control px-3 py-2 text-primary-700 focus-visible:ring-2 focus-visible:ring-ring"
              >
                Write
              </Link>
            </nav>
            <button
              type="button"
              onClick={logout}
              className="ml-auto rounded-control px-4 py-2 font-semibold text-primary-700 hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring"
            >
              Logout
            </button>
            {logoutError && (
              <p
                role="alert"
                className="w-full rounded-control bg-error-light p-4 text-error"
              >
                {logoutError}
              </p>
            )}
          </div>
        )}
      <Routes>
        <Route path="/" element={<LandingPage session={session} />} />
        <Route
          path="/login"
          element={
            session ? (
              <Navigate to={getRoleHome(session)} replace />
            ) : (
              <LoginPage onSessionChange={setSession} />
            )
          }
        />
        <Route
          path="/register"
          element={
            session ? (
              <Navigate to={getRoleHome(session)} replace />
            ) : (
              <RegisterPage onSessionChange={setSession} />
            )
          }
        />
        <Route
          path="/blogs"
          element={session ? <Home /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/blog/:id"
          element={session ? <ReadBlog /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/write"
          element={session ? <WriteBlog /> : <Navigate to="/login" replace />}
        />
        <Route path="/edit/:id" element={welcome()} />
        {["/admin", "/users"].map((path) => (
          <Route key={path} path={path} element={welcome(true)} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
