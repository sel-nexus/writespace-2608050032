/** Exercise trusted permissions and shared navigation against real browser-local state. */
import { it, expect, vi } from "vitest";
import { render, screen, within, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import App from "../src/App";
import { ProtectedRoute } from "../src/components/ProtectedRoute";
import { Navbar } from "../src/components/Navbar";
import { BlogCard } from "../src/components/BlogCard";
import { getAvatar, getAuthorRole } from "../src/components/Avatar";
import { login, register, getSession, clearSession } from "../src/utils/auth";
import { createPost, findPost, getPosts } from "../src/utils/posts";
import { getUsers, saveUsers, savePosts } from "../src/utils/storage";

/** Expose route outcomes without replacing user navigation. */
function Location() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}
/** Mount the actual app from one initial entry. */
function mount(path = "/blogs") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Location />
    </MemoryRouter>,
  );
}
/** Establish a schema-valid real writer and optionally their post. */
function ownerPost() {
  register({
    displayName: "Owner",
    username: "owner",
    password: "demo",
    confirmPassword: "demo",
  });
  return createPost({ title: "Original story", content: "Original\ntext" });
}
/** Register a separate writer who cannot manage the original author's post. */
function otherWriter() {
  return register({
    displayName: "Other",
    username: "other",
    password: "demo",
    confirmPassword: "demo",
  });
}
/** Open the account disclosure before invoking its logout action. */
async function logout(user) {
  await user.click(screen.getByRole("button", { name: /Account options/ }));
  await user.click(screen.getByRole("button", { name: "Logout" }));
}

it.each([
  "/blogs",
  "/write",
  "/blog/missing",
  "/edit/missing",
  "/admin",
  "/users",
])("redirects guests from %s", (path) => {
  mount(path);
  expect(screen.getByLabelText("Current route")).toHaveTextContent("/login");
  expect(
    screen.getByRole("heading", { name: "Login", exact: true }),
  ).toBeVisible();
});
it.each(["/admin", "/users"])(
  "denies writer admin route %s despite elevated stored role",
  (path) => {
    const session = otherWriter();
    localStorage.setItem(
      "writespace_session",
      JSON.stringify({ ...session, role: "admin" }),
    );
    mount(path);
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/blogs");
    expect(
      screen.queryByRole("link", { name: "Users" }),
    ).not.toBeInTheDocument();
  },
);
it("ignores forged guard props and invalidates a deleted current account", () => {
  otherWriter();
  const view = render(
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route
          path="/secret"
          element={
            <ProtectedRoute
              adminOnly
              session={{ userId: "admin", role: "admin" }}
            >
              <h1>Secret</h1>
            </ProtectedRoute>
          }
        />
        <Route path="/blogs" element={<h1>Denied</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { name: "Denied" })).toBeVisible();
  view.unmount();
  mount();
  saveUsers([]);
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", { key: "writespace_users" }),
    ),
  );
  expect(screen.getByLabelText("Current route")).toHaveTextContent("/login");
  expect(getSession()).toBeNull();
});
it.each(["owner", "admin", "other"])(
  "shows only authorized reader/card actions for %s",
  (role) => {
    const original = ownerPost();
    if (role === "admin") login("admin", "admin");
    if (role === "other") otherWriter();
    const view = mount(`/blog/${original.id}`);
    const main = screen.getByRole("main");
    if (role === "other") {
      expect(within(main).getAllByRole("link")).toHaveLength(1);
      expect(
        within(main).queryByRole("button", { name: "Delete" }),
      ).not.toBeInTheDocument();
      expect(
        within(main).queryByRole("link", { name: "Edit" }),
      ).not.toBeInTheDocument();
    } else {
      expect(within(main).getByRole("link", { name: "Edit" })).toHaveAttribute(
        "href",
        `/edit/${original.id}`,
      );
      expect(
        within(main).getByRole("button", { name: "Delete" }),
      ).toBeVisible();
    }
    view.unmount();
    const card = render(
      <MemoryRouter>
        <BlogCard post={original} />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole("link", { name: "Edit Original story" }) !== null,
    ).toBe(role !== "other");
    expect(card.container.querySelector("a a")).toBeNull();
  },
);
it("redirects other-author edit entry and preserves the original", () => {
  const original = ownerPost();
  otherWriter();
  mount(`/edit/${original.id}`);
  expect(screen.getByLabelText("Current route")).toHaveTextContent("/blogs");
  expect(findPost(original.id)).toEqual(original);
});
it.each(["/blog/missing", "/edit/missing"])(
  "shows recoverable missing state for %s",
  async (path) => {
    login("admin", "admin");
    const user = userEvent.setup();
    mount(path);
    expect(
      screen.getByRole("heading", { name: "Post not found" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Back to All Posts" }));
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/blogs");
  },
);
it.each(["owner", "admin"])(
  "prefills, cancels and saves edit as %s preserving original metadata",
  async (role) => {
    const original = ownerPost();
    if (role === "admin") login("admin", "admin");
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("link", { name: "Edit Original story" }));
    expect(screen.getByLabelText("Title")).toHaveValue(original.title);
    expect(screen.getByLabelText("Content")).toHaveValue(original.content);
    expect(
      screen.getByText(`${original.content.length} characters`),
    ).toBeVisible();
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Unsaved");
    await user.click(screen.getByRole("link", { name: "Cancel" }));
    expect(screen.getByLabelText("Current route").textContent).toBe(
      `/blog/${original.id}`,
    );
    expect(findPost(original.id)).toEqual(original);
    await user.click(screen.getByRole("link", { name: "Edit", exact: true }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "  Revised  " },
    });
    fireEvent.change(screen.getByLabelText("Content"), {
      target: { value: "  Revised\n<script>literal</script>  " },
    });
    await user.click(screen.getByRole("button", { name: "Save" }));
    const updated = {
      ...original,
      title: "Revised",
      content: "  Revised\n<script>literal</script>  ",
    };
    expect(findPost(original.id)).toEqual(updated);
    expect(screen.getByRole("heading", { name: "Revised" })).toBeVisible();
    expect(screen.getByRole("main").querySelector("script")).toBeNull();
  },
);
it("validates edit fields, retains draft on failed write and retries successfully", async () => {
  const original = ownerPost();
  const user = userEvent.setup();
  mount(`/edit/${original.id}`);
  await user.clear(screen.getByLabelText("Title"));
  await user.clear(screen.getByLabelText("Content"));
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getAllByRole("alert")).toHaveLength(2);
  expect(screen.getByLabelText("Title")).toHaveAttribute(
    "aria-describedby",
    "title-error",
  );
  expect(screen.getByLabelText("Content")).toHaveAttribute(
    "aria-describedby",
    "content-error content-count",
  );
  await user.type(screen.getByLabelText("Title"), "Draft");
  await user.type(screen.getByLabelText("Content"), "Draft text");
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to save data");
  expect(screen.getByLabelText("Title")).toHaveValue("Draft");
  expect(screen.getByLabelText("Content")).toHaveValue("Draft text");
  expect(screen.getByLabelText("Current route").textContent).toBe(
    `/edit/${original.id}`,
  );
  expect(findPost(original.id)).toEqual(original);
  spy.mockRestore();
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(findPost(original.id)).toEqual({
    ...original,
    title: "Draft",
    content: "Draft text",
  });
});
it.each(["owner", "admin"])(
  "canceled confirmation leaves state intact, confirmed deletion removes only target as %s",
  async (role) => {
    const original = ownerPost();
    const retained = createPost({ title: "Retained", content: "Text" });
    if (role === "admin") login("admin", "admin");
    const user = userEvent.setup();
    mount(`/blog/${original.id}`);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(getPosts()).toEqual([original, retained]);
    expect(screen.getByRole("heading", { name: original.title })).toBeVisible();
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(getPosts()).toEqual([retained]);
    expect(findPost(original.id)).toBeNull();
    expect(screen.getByLabelText("Current route").textContent).toBe("/blogs");
  },
);
it("failed deletion preserves reader and storage and supports retry", async () => {
  const original = ownerPost();
  const user = userEvent.setup();
  mount(`/blog/${original.id}`);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  await user.click(screen.getByRole("button", { name: "Delete" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to save data");
  expect(findPost(original.id)).toEqual(original);
  expect(screen.getByLabelText("Current route").textContent).toBe(
    `/blog/${original.id}`,
  );
  spy.mockRestore();
  await user.click(screen.getByRole("button", { name: "Delete" }));
  expect(getPosts()).toEqual([]);
});
it.each(["edit", "delete"])(
  "rechecks deleted current account at mounted %s operation",
  async (operation) => {
    const original = ownerPost();
    const user = userEvent.setup();
    mount(
      operation === "edit" ? `/edit/${original.id}` : `/blog/${original.id}`,
    );
    saveUsers([]);
    if (operation === "delete")
      vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(
      screen.getByRole("button", {
        name: operation === "edit" ? "Save" : "Delete",
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Please log in again");
    expect(getPosts()).toEqual([original]);
  },
);
it("uses actual account roles for author avatars with safe orphan/invalid fallback", () => {
  ownerPost();
  const account = getUsers()[0];
  expect(getAuthorRole(account.id)).toBe("user");
  saveUsers([{ ...account, role: "admin" }]);
  expect(getAuthorRole(account.id)).toBe("admin");
  expect(getAuthorRole("admin")).toBe("admin");
  expect(getAuthorRole(undefined)).toBe("user");
  expect(getAuthorRole({ role: "admin" })).toBe("user");
  saveUsers([]);
  expect(getAuthorRole(account.id)).toBe("user");
  const view = render(getAvatar("admin"));
  expect(screen.getByText("👑")).toHaveClass("bg-violet-600");
  expect(screen.getByText("👑")).toHaveAttribute("aria-hidden", "true");
  view.rerender(getAvatar("unexpected"));
  expect(screen.getByText("📚")).toHaveClass("bg-indigo-500");
});
it.each(["admin", "user"])(
  "provides one shared navbar, active pills and mobile toggling for %s",
  async (role) => {
    if (role === "admin") login("admin", "admin");
    else otherWriter();
    const user = userEvent.setup();
    mount();
    expect(
      screen.queryByRole("navigation", { name: "Main navigation" }),
    ).not.toBeInTheDocument();
    const nav = screen.getByRole("navigation", {
      name: "Workspace navigation",
    });
    expect(within(nav).getAllByRole("link")).toHaveLength(
      role === "admin" ? 3 : 2,
    );
    expect(
      within(nav).getByRole("link", { name: "All Blogs" }),
    ).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "All Blogs" })).toHaveClass(
      "bg-primary-600",
      "rounded-full",
    );
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", nav.id);
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    await user.click(
      within(nav).getByRole("link", { name: "Write", exact: true }),
    );
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      within(nav).getByRole("link", { name: "Write", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    if (role === "admin") {
      await user.click(within(nav).getByRole("link", { name: "Users" }));
      expect(screen.getByLabelText("Current route").textContent).toBe("/users");
    }
    await user.click(screen.getByRole("link", { name: "WriteSpace" }));
    expect(screen.getByLabelText("Current route").textContent).toBe("/");
    expect(
      screen.queryByRole("navigation", { name: "Workspace navigation" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
  },
);
it("supports account disclosure toggle, Escape focus restore and real logout", async () => {
  otherWriter();
  const user = userEvent.setup();
  mount("/write");
  const account = screen.getByRole("button", { name: /Account options/ });
  expect(account).toHaveAttribute("aria-expanded", "false");
  expect(
    screen.queryByRole("button", { name: "Logout" }),
  ).not.toBeInTheDocument();
  await user.click(account);
  expect(account).toHaveAttribute("aria-expanded", "true");
  await user.click(account);
  expect(account).toHaveAttribute("aria-expanded", "false");
  await user.click(account);
  await user.tab();
  expect(screen.getByRole("button", { name: "Logout" })).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(account).toHaveFocus();
  expect(account).toHaveAttribute("aria-expanded", "false");
  await logout(user);
  expect(getSession()).toBeNull();
  expect(localStorage.getItem("writespace_session")).toBeNull();
  expect(screen.getByLabelText("Current route").textContent).toBe("/");
});
it("reports failed logout and retains identity until retry succeeds", async () => {
  login("admin", "admin");
  const user = userEvent.setup();
  mount("/admin");
  const spy = vi
    .spyOn(Storage.prototype, "removeItem")
    .mockImplementation(() => {
      throw new Error("blocked");
    });
  await logout(user);
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to log out");
  expect(getSession().role).toBe("admin");
  expect(screen.getByLabelText("Current route").textContent).toBe("/admin");
  spy.mockRestore();
  await user.click(screen.getByRole("button", { name: "Logout" }));
  expect(getSession()).toBeNull();
});
it("calls the provided logout action without owning session clearing and closes disclosure on blur", async () => {
  const session = otherWriter();
  const onLogout = vi.fn();
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <Navbar session={session} onLogout={onLogout} />
      <button type="button">Outside</button>
    </MemoryRouter>,
  );
  await user.click(screen.getByRole("button", { name: /Account options/ }));
  await user.click(screen.getByRole("button", { name: "Outside" }));
  expect(
    screen.queryByRole("button", { name: "Logout" }),
  ).not.toBeInTheDocument();
  await logout(user);
  expect(onLogout).toHaveBeenCalledOnce();
  expect(getSession()).toEqual(session);
});
