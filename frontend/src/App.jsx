/** Compose public identity and guarded workspace routes without global context. */
import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { PublicNavbar } from "./components/PublicNavbar";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Home from "./pages/Home";
import ReadBlog from "./pages/ReadBlog";
import WriteBlog from "./pages/WriteBlog";
import { clearSession, getRoleHome, getSession } from "./utils/auth";

/** Synchronize account-derived display identity and compose permission boundaries.
 * Returns: {JSX.Element} One navigation shell, guarded routes and logout feedback.
 * Notes: Administration content remains temporary until its planned slice.
 */
export default function App() {
  const [session, setSession] = useState(getSession);
  const [logoutError, setLogoutError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    /** Refresh identity after navigation or another tab's account/session change. */
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

  /** Acknowledge logout only after trusted storage clearing succeeds. */
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

  /** Render the administration slice's retained temporary welcome state. */
  function welcome() {
    const current = getSession();
    return (
      <main id="main-content" className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
          Administrator account
        </p>
        <h1 className="mt-5 break-words font-display text-5xl">
          Welcome, {current?.displayName}.
        </h1>
        <p className="mt-6 text-lg text-foreground-muted">
          You are signed in as {current?.username}. Your account and session are
          saved in this browser.
        </p>
        <p className="mt-4 text-foreground-muted">
          Read and manage posts using the navigation above. Account-management
          tools arrive in the administration slice.
        </p>
        <p className="mt-12 max-w-xl text-sm leading-relaxed text-warning">
          Local demo only. Credentials are plaintext and browser-side guards are
          not production security. Never store real passwords or sensitive data.
        </p>
      </main>
    );
  }
  const publicPage = ["/", "/login", "/register"].includes(location.pathname);
  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary-100">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-control bg-surface p-4 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      {publicPage ? (
        <PublicNavbar session={session} />
      ) : session ? (
        <Navbar key={session.userId} session={session} onLogout={logout} />
      ) : null}
      {logoutError && (
        <p
          role="alert"
          className="mx-auto max-w-6xl rounded-control bg-error-light p-4 text-error"
        >
          {logoutError}
        </p>
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
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/blog/:id"
          element={
            <ProtectedRoute>
              <ReadBlog key={location.pathname} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/write"
          element={
            <ProtectedRoute>
              <WriteBlog key={location.pathname} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <ProtectedRoute>
              <WriteBlog key={location.pathname} />
            </ProtectedRoute>
          }
        />
        {["/admin", "/users"].map((path) => (
          <Route
            key={path}
            path={path}
            element={<ProtectedRoute adminOnly>{welcome()}</ProtectedRoute>}
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
