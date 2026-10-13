/** Verify identity entry journeys through real App routes and browser-local data. */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import App from "../src/App";
import { getSession, login, register } from "../src/utils/auth";
import { getUsers, savePosts } from "../src/utils/storage";

/** Expose location for assertions without programmatic in-app teleportation. */
function Location() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}
/** Mount App from a single entry point. */
function mount(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Location />
    </MemoryRouter>,
  );
}
/** Fill account fields through accessible labels. */
async function fillRegistration(user, username = "ada") {
  await user.type(screen.getByLabelText("Display Name"), "Ada Lovelace");
  await user.type(screen.getByLabelText("Username"), username);
  await user.type(screen.getByLabelText("Password", { exact: true }), "demo");
  await user.type(screen.getByLabelText("Confirm Password"), "demo");
}

describe("public entry", () => {
  it("shows editorial discovery, empty posts, warning and footer; Start Reading opens login", async () => {
    const user = userEvent.setup();
    mount();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Your thoughts.",
    );
    for (const text of [
      "Write Freely",
      "Private & Local",
      "Instant & Fast",
      "Latest from the Blog",
    ]) {
      expect(screen.getByRole("heading", { name: text })).toBeVisible();
    }
    expect(screen.getByText("No posts yet — check back soon!")).toBeVisible();
    expect(screen.getByText(/Client-side access checks/)).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Footer navigation" }),
    ).toBeVisible();
    await user.click(screen.getByRole("link", { name: "Start Reading" }));
    expect(
      screen.getByRole("heading", { name: "Login", exact: true }),
    ).toBeVisible();
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/login");
  });
  it("uses live newest three previews with guest reading redirect and escaped markup", async () => {
    const user = userEvent.setup();
    savePosts(
      [1, 2, 3, 4].map((n) => ({
        id: `${n}2345678-1234-4123-8123-123456789abc`,
        title: `Story ${n}`,
        content: "<script>not executed</script>",
        createdAt: `2024-01-0${n}T00:00:00.000Z`,
        authorId: "admin",
        authorName: "Admin",
      })),
    );
    mount();
    expect(
      screen.queryByRole("heading", { name: "Story 1" }),
    ).not.toBeInTheDocument();
    const latest = screen.getByRole("region", { name: "Latest from the Blog" });
    expect(
      within(latest)
        .getAllByRole("link")
        .slice(1)
        .map((link) => link.textContent),
    ).toEqual([
      expect.stringContaining("Story 4"),
      expect.stringContaining("Story 3"),
      expect.stringContaining("Story 2"),
    ]);
    expect(
      screen.getAllByText("<script>not executed</script>").length,
    ).toBeGreaterThan(0);
    await user.click(within(latest).getByRole("link", { name: /Story 3/ }));
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/login");
  });
  it("degrades malformed and inaccessible storage without a crash", () => {
    localStorage.setItem("writespace_posts", '[{"title":{}}]');
    localStorage.setItem("writespace_session", "{");
    localStorage.setItem("writespace_users", "{}");
    const view = mount();
    expect(screen.getByText("No posts yet — check back soon!")).toBeVisible();
    view.unmount();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    mount();
    expect(screen.getByText("No posts yet — check back soon!")).toBeVisible();
  });
  it("toggles mobile navigation and closes it when an entry link is selected", async () => {
    const user = userEvent.setup();
    mount();
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Main navigation" }),
      ).getByRole("link", { name: "Get Started" }),
    );
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByLabelText("Current route")).toHaveTextContent(
      "/register",
    );
  });
});

describe("forms and persistence", () => {
  it("registers via hero, persists across remount, logs out and logs in as writer", async () => {
    const user = userEvent.setup();
    const view = mount();
    await user.click(screen.getByRole("link", { name: "Get Started Free" }));
    await fillRegistration(user);
    await user.click(
      screen.getByRole("button", { name: "Register", exact: true }),
    );
    expect(
      screen.getByRole("heading", { name: "All Blogs", exact: true }),
    ).toBeVisible();
    expect(
      screen.getByText("No blogs yet. Be the first to write one!"),
    ).toBeVisible();
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/blogs");
    expect(getUsers()[0].username).toBe("ada");
    const session = getSession();
    view.unmount();
    mount("/blogs");
    expect(
      screen.getByRole("heading", { name: "All Blogs", exact: true }),
    ).toBeVisible();
    expect(
      screen.getByText("No blogs yet. Be the first to write one!"),
    ).toBeVisible();
    expect(getSession()).toEqual(session);
    await user.click(screen.getByRole("button", { name: "Logout" }));
    expect(getSession()).toBeNull();
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Main navigation" }),
      ).getByRole("link", { name: "Login" }),
    );
    await user.type(screen.getByLabelText("Username"), "ada");
    await user.type(screen.getByLabelText("Password"), "demo");
    await user.click(screen.getByRole("button", { name: "Login" }));
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/blogs");
    expect(getSession()).toEqual(session);
  });
  it("shows required registration fields, mismatched confirmation and reserved username", async () => {
    const user = userEvent.setup();
    mount("/register");
    await user.click(screen.getByRole("button", { name: "Register" }));
    expect(screen.getAllByRole("alert")).toHaveLength(4);
    expect(screen.getByLabelText("Display Name")).toHaveAttribute(
      "aria-describedby",
      "displayName-error",
    );
    await fillRegistration(user, "admin");
    await user.clear(screen.getByLabelText("Confirm Password"));
    await user.type(screen.getByLabelText("Confirm Password"), "other");
    await user.click(screen.getByRole("button", { name: "Register" }));
    expect(screen.getByText("Passwords must match.")).toBeVisible();
    expect(screen.getByText("Username is already taken.")).toBeVisible();
    expect(getUsers()).toEqual([]);
    expect(getSession()).toBeNull();
  });
  it("rejects an existing writer username in the visible form", async () => {
    register({
      displayName: "Ada",
      username: "ada",
      password: "demo",
      confirmPassword: "demo",
    });
    localStorage.removeItem("writespace_session");
    const user = userEvent.setup();
    mount("/register");
    await fillRegistration(user);
    await user.click(screen.getByRole("button", { name: "Register" }));
    expect(screen.getByText("Username is already taken.")).toBeVisible();
    expect(getUsers()).toHaveLength(1);
  });
  it("shows login required and invalid-credential errors, then enters admin home", async () => {
    const user = userEvent.setup();
    mount("/login");
    await user.click(screen.getByRole("button", { name: "Login" }));
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Login" }));
    expect(screen.getByText("Invalid username or password.")).toBeVisible();
    await user.clear(screen.getByLabelText("Password"));
    await user.type(screen.getByLabelText("Password"), "admin");
    await user.click(screen.getByRole("button", { name: "Login" }));
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/admin");
    expect(
      screen.getByRole("heading", { name: "Welcome, Admin." }),
    ).toBeVisible();
  });
  it.each(["/login", "/register"])(
    "exchanges form entry links from %s",
    async (path) => {
      const user = userEvent.setup();
      mount(path);
      const main = screen.getByRole("main");
      await user.click(
        within(main).getByRole("link", {
          name: path === "/login" ? "Register" : "Login",
        }),
      );
      expect(screen.getByLabelText("Current route")).toHaveTextContent(
        path === "/login" ? "/register" : "/login",
      );
    },
  );
  it.each(["/login", "/register"])(
    "surfaces unavailable writes on %s without welcome or session",
    async (path) => {
      const user = userEvent.setup();
      mount(path);
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("quota");
      });
      if (path === "/register") await fillRegistration(user);
      else {
        await user.type(screen.getByLabelText("Username"), "admin");
        await user.type(screen.getByLabelText("Password"), "admin");
      }
      await user.click(
        screen.getByRole("button", {
          name: path === "/login" ? "Login" : "Register",
        }),
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Enable browser storage",
      );
      expect(screen.getByLabelText("Current route")).toHaveTextContent(path);
      expect(getSession()).toBeNull();
    },
  );
  it("shows session-write failure on registration and rolls back the account", async () => {
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(
      function (key, value) {
        if (key === "writespace_session") throw new Error("quota");
        original.call(this, key, value);
      },
    );
    const user = userEvent.setup();
    mount("/register");
    await fillRegistration(user);
    await user.click(screen.getByRole("button", { name: "Register" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to save your session",
    );
    expect(getUsers()).toEqual([]);
    expect(getSession()).toBeNull();
  });
  it("reports failed logout and leaves the signed-in identity visible", async () => {
    login("admin", "admin");
    const user = userEvent.setup();
    mount("/admin");
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await user.click(screen.getByRole("button", { name: "Logout" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to log out");
    expect(
      screen.getByRole("heading", { name: "Welcome, Admin." }),
    ).toBeVisible();
    expect(getSession()).not.toBeNull();
  });
});

describe("identity route boundaries", () => {
  it.each([
    "/blogs",
    "/blog/unknown",
    "/write",
    "/edit/unknown",
    "/admin",
    "/users",
  ])("redirects guest entry %s to login", (path) => {
    mount(path);
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/login");
  });
  it.each(["/login", "/register"])(
    "redirects authenticated form entry %s to role home",
    (path) => {
      login("admin", "admin");
      mount(path);
      expect(screen.getByLabelText("Current route")).toHaveTextContent(
        "/admin",
      );
    },
  );
  it.each(["/admin", "/users"])(
    "does not expose admin entry %s to writers",
    (path) => {
      register({
        displayName: "Ada",
        username: "ada",
        password: "demo",
        confirmPassword: "demo",
      });
      mount(path);
      expect(screen.getByLabelText("Current route")).toHaveTextContent(
        "/blogs",
      );
    },
  );
  it.each(["admin", "user"])(
    "adapts public navigation and reading for %s",
    async (role) => {
      if (role === "admin") login("admin", "admin");
      else
        register({
          displayName: "Ada",
          username: "ada",
          password: "demo",
          confirmPassword: "demo",
        });
      const user = userEvent.setup();
      mount();
      const nav = screen.getByRole("navigation", { name: "Main navigation" });
      expect(
        within(nav).queryByRole("link", { name: "Login" }),
      ).not.toBeInTheDocument();
      expect(
        within(nav).getByRole("link", { name: "Go to Dashboard" }),
      ).toHaveAttribute("href", role === "admin" ? "/admin" : "/blogs");
      await user.click(screen.getByRole("link", { name: "Start Reading" }));
      expect(screen.getByLabelText("Current route")).toHaveTextContent(
        "/blogs",
      );
    },
  );
  it("invalidates deleted-account session on a storage event and redirects", () => {
    register({
      displayName: "Ada",
      username: "ada",
      password: "demo",
      confirmPassword: "demo",
    });
    mount("/blogs");
    localStorage.setItem("writespace_users", "[]");
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", { key: "writespace_users" }),
      ),
    );
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/login");
    expect(getSession()).toBeNull();
  });
  it("returns unknown routes to public discovery", () => {
    mount("/missing");
    expect(screen.getByLabelText("Current route").textContent).toBe("/");
  });
});
