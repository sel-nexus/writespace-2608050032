/** Exercise administration pages and components through real routes and local state. */
import { it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";
import AdminDashboard from "../src/pages/AdminDashboard";
import UserManagement from "../src/pages/UserManagement";
import { UserRow } from "../src/components/UserRow";
import { StatCard } from "../src/components/StatCard";
import { login, getSession } from "../src/utils/auth";
import { getUsers, getPosts, savePosts, saveUsers } from "../src/utils/storage";
import { createUser } from "../src/utils/users";
import { createPost } from "../src/utils/posts";

/** Mount the actual application with one initial route. */
function mount(path = "/admin") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
/** Fill the short admin form through accessible controls. */
async function fill(
  user,
  username = "writer",
  role = "user",
  displayName = "Writer",
) {
  await user.type(screen.getByLabelText("Display Name"), displayName);
  await user.type(screen.getByLabelText("Username"), username);
  await user.type(screen.getByLabelText("Password"), "demo");
  await user.selectOptions(screen.getByLabelText("Role"), role);
}
/** Read the value paired with a statistic label. */
function count(label) {
  return screen.getByText(label, { selector: "dt" }).nextElementSibling
    .textContent;
}
/** Select the desktop semantic accounts table in jsdom (CSS media queries are not simulated). */
function table() {
  return screen.getByRole("table", { name: "User accounts" });
}
/** Seed intentionally unordered schema-valid posts. */
function posts() {
  const records = [2, 6, 1, 4, 3, 5].map((n) => ({
    id: `${n}2345678-1234-4123-8123-123456789abc`,
    title: `Story ${n}`,
    content: "Text",
    createdAt: `2024-01-0${n}T00:00:00.000Z`,
    authorId: "admin",
    authorName: "Admin",
  }));
  savePosts(records);
  return records;
}

it("shows accurate empty counts and quick actions, links to actual user management and writing", async () => {
  login("admin", "admin");
  const user = userEvent.setup();
  mount();
  expect(
    screen.getByRole("heading", { name: "Admin Dashboard" }),
  ).toBeVisible();
  expect(
    ["Total Posts", "Total Users", "Total Admins", "Standard Writers"].map(
      count,
    ),
  ).toEqual(["0", "1", "1", "0"]);
  expect(screen.getByText("No posts yet. Write the first post.")).toBeVisible();
  expect(screen.getByRole("link", { name: "Write New Post" })).toHaveAttribute(
    "href",
    "/write",
  );
  await user.click(screen.getByRole("link", { name: "Manage Users" }));
  expect(
    screen.getByRole("heading", { name: "User Management" }),
  ).toBeVisible();
  expect(screen.getByText(/No additional accounts yet/)).toBeVisible();
  await user.click(screen.getByRole("link", { name: "Back to Dashboard" }));
  await user.click(screen.getByRole("link", { name: "Write New Post" }));
  expect(screen.getByRole("heading", { name: "Write a post" })).toBeVisible();
});
it("sorts and limits latest five with reading/edit links, cancel leaves storage unchanged, delete refreshes counts and membership", async () => {
  login("admin", "admin");
  const records = posts();
  const user = userEvent.setup();
  mount();
  const latest = screen.getByRole("region", { name: "Latest Posts" });
  expect(
    within(latest)
      .getAllByRole("listitem")
      .map((item) => within(item).getAllByRole("link")[0].textContent),
  ).toEqual(["Story 6", "Story 5", "Story 4", "Story 3", "Story 2"]);
  expect(
    within(latest).queryByRole("link", { name: "Story 1", exact: true }),
  ).toBeNull();
  expect(
    within(latest).getByRole("link", { name: "Edit Story 6" }),
  ).toHaveAttribute("href", `/edit/${records[1].id}`);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  await user.click(screen.getByRole("button", { name: "Delete Story 6" }));
  expect(getPosts()).toEqual(records);
  expect(count("Total Posts")).toBe("6");
  confirm.mockReturnValue(true);
  await user.click(screen.getByRole("button", { name: "Delete Story 6" }));
  expect(count("Total Posts")).toBe("5");
  expect(
    screen.queryByRole("link", { name: "Story 6", exact: true }),
  ).toBeNull();
  expect(
    screen.getByRole("link", { name: "Story 1", exact: true }),
  ).toBeVisible();
  expect(getPosts()).toEqual(
    records.filter((post) => post.title !== "Story 6"),
  );
  await user.click(screen.getByRole("link", { name: "Edit Story 5" }));
  expect(screen.getByLabelText("Title")).toHaveValue("Story 5");
  await user.click(screen.getByRole("link", { name: "Cancel" }));
  expect(screen.getByRole("heading", { name: "Story 5" })).toBeVisible();
});
it("dashboard failed writes show inline error without changing counts or posts, retry succeeds", async () => {
  login("admin", "admin");
  const post = createPost({ title: "Retained", content: "Text" });
  const user = userEvent.setup();
  mount();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  await user.click(screen.getByRole("button", { name: "Delete Retained" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to save data");
  expect(count("Total Posts")).toBe("1");
  expect(getPosts()).toEqual([post]);
  spy.mockRestore();
  await user.click(screen.getByRole("button", { name: "Delete Retained" }));
  expect(count("Total Posts")).toBe("0");
  expect(screen.queryByRole("alert")).toBeNull();
});
it.each(["user", "admin"])(
  "creates %s via form, clears fields, announces success and refreshes dashboard counts",
  async (role) => {
    login("admin", "admin");
    const session = getSession();
    const user = userEvent.setup();
    mount("/users");
    await fill(user, "new-account", role);
    await user.click(screen.getByRole("button", { name: "Create User" }));
    expect(getUsers()).toEqual([
      expect.objectContaining({ username: "new-account", role }),
    ]);
    expect(screen.getByRole("status")).toHaveTextContent(
      `Created Writer as ${role === "admin" ? "Admin" : "user"}.`,
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    for (const label of ["Display Name", "Username", "Password", "Role"])
      expect(screen.getByLabelText(label)).toHaveValue("");
    expect(
      within(table()).getByRole("button", { name: "Delete new-account" }),
    ).toBeEnabled();
    expect(getSession()).toEqual(session);
    await user.click(screen.getByRole("link", { name: "Back to Dashboard" }));
    expect(
      ["Total Users", "Total Admins", "Standard Writers"].map(count),
    ).toEqual(["2", role === "admin" ? "2" : "1", role === "user" ? "1" : "0"]);
  },
);
it("exposes all required errors and associations, clears field error on change and rejects reserved/duplicate names", async () => {
  login("admin", "admin");
  createUser({
    displayName: "Existing",
    username: "existing",
    password: "demo",
    role: "admin",
  });
  const user = userEvent.setup();
  mount("/users");
  await user.click(screen.getByRole("button", { name: "Create User" }));
  expect(screen.getAllByRole("alert")).toHaveLength(4);
  for (const [label, name] of [
    ["Display Name", "displayName"],
    ["Username", "username"],
    ["Password", "password"],
    ["Role", "role"],
  ]) {
    expect(screen.getByLabelText(label)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText(label)).toHaveAttribute(
      "aria-describedby",
      `user-${name}-error`,
    );
    expect(screen.getByLabelText(label)).toHaveAttribute(
      "aria-required",
      "true",
    );
  }
  await fill(user, " admin ");
  expect(screen.queryByText("Display Name is required.")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Create User" }));
  expect(screen.getByText("Username is already taken.")).toBeVisible();
  await user.clear(screen.getByLabelText("Username"));
  await user.type(screen.getByLabelText("Username"), " existing ");
  await user.click(screen.getByRole("button", { name: "Create User" }));
  expect(screen.getByText("Username is already taken.")).toBeVisible();
  expect(getUsers()).toHaveLength(1);
  expect(screen.getByLabelText("Username")).toHaveValue(" existing ");
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});
it("failed create keeps input, never reports success, retries then clears stale success on editing", async () => {
  login("admin", "admin");
  const user = userEvent.setup();
  mount("/users");
  await fill(user);
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  await user.click(screen.getByRole("button", { name: "Create User" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to save data");
  expect(getUsers()).toEqual([]);
  expect(screen.getByLabelText("Username")).toHaveValue("writer");
  expect(screen.getByLabelText("Password")).toHaveValue("demo");
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  spy.mockRestore();
  await user.click(screen.getByRole("button", { name: "Create User" }));
  expect(screen.getByRole("status")).toHaveTextContent("Created Writer");
  await user.type(screen.getByLabelText("Display Name"), "Another");
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});
it("protects default/current account in both structures, confirms/cancels eligible deletion and retains author posts", async () => {
  login("admin", "admin");
  const current = createUser({
    displayName: "Second",
    username: "second",
    password: "demo",
    role: "admin",
  });
  const writer = createUser({
    displayName: "Writer",
    username: "writer",
    password: "demo",
    role: "user",
  });
  login("writer", "demo");
  const post = createPost({ title: "Kept attribution", content: "Text" });
  login("second", "demo");
  const user = userEvent.setup();
  const view = mount("/users");
  expect(
    within(table())
      .getAllByRole("columnheader")
      .map((node) => node.textContent),
  ).toEqual([
    "Avatar",
    "Display Name",
    "Username",
    "Role",
    "Created Date",
    "Action",
  ]);
  for (const [username, tooltip] of [
    ["admin", "Default admin cannot be deleted."],
    ["second", "Current account cannot be deleted."],
  ]) {
    for (const button of screen.getAllByRole("button", {
      name: `Delete ${username}`,
    })) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("title", tooltip);
    }
  }
  expect(view.container.querySelector("div > tr")).toBeNull();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  await user.click(
    within(table()).getByRole("button", { name: "Delete writer" }),
  );
  expect(getUsers()).toEqual([current, writer]);
  confirm.mockReturnValue(true);
  await user.click(
    within(table()).getByRole("button", { name: "Delete writer" }),
  );
  expect(getUsers()).toEqual([current]);
  expect(getPosts()).toEqual([post]);
  expect(screen.queryByRole("button", { name: "Delete writer" })).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Existing posts and attribution were retained.",
  );
});
it("failed account deletion preserves visible row and saved accounts, retry succeeds", async () => {
  login("admin", "admin");
  const account = createUser({
    displayName: "Writer",
    username: "writer",
    password: "demo",
    role: "user",
  });
  const user = userEvent.setup();
  mount("/users");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  await user.click(
    within(table()).getByRole("button", { name: "Delete writer" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to save data");
  expect(getUsers()).toEqual([account]);
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  spy.mockRestore();
  await user.click(
    within(table()).getByRole("button", { name: "Delete writer" }),
  );
  expect(getUsers()).toEqual([]);
});
it("mobile UserRow exposes stacked details and real action without invalid table markup", async () => {
  const user = userEvent.setup();
  const account = {
    id: "12345678-1234-4123-8123-123456789abc",
    username: "writer",
    displayName: "Mobile Writer",
    role: "user",
    createdAt: "2024-01-01T00:00:00.000Z",
  };
  let deleted = "";
  const view = render(
    <UserRow
      user={account}
      currentId="admin"
      onDelete={(id) => {
        deleted = id;
      }}
      mobile
    />,
  );
  expect(screen.getByRole("article", { name: "Account writer" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Mobile Writer" })).toBeVisible();
  expect(screen.getByText("Jan 01, 2024")).toBeVisible();
  expect(view.container.querySelector("tr, td, th")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Delete writer" }));
  expect(deleted).toBe(account.id);
});
it("renders saved markup as escaped account and linked post text without injecting elements", async () => {
  login("admin", "admin");
  const user = userEvent.setup();
  const view = mount("/users");
  await fill(user, "<img src=x>", "admin", "<script>alert(1)</script>");
  await user.click(screen.getByRole("button", { name: "Create User" }));
  expect(within(table()).getByText("<script>alert(1)</script>")).toBeVisible();
  expect(view.container.querySelector("script, img")).toBeNull();
  createPost({ title: "<script>title</script>", content: "Text" });
  await user.click(screen.getByRole("link", { name: "Back to Dashboard" }));
  await user.click(
    screen.getByRole("link", { name: "<script>title</script>", exact: true }),
  );
  expect(
    screen.getByRole("heading", { name: "<script>title</script>" }),
  ).toBeVisible();
  expect(view.container.querySelector("script, img")).toBeNull();
});
it.each([AdminDashboard, UserManagement])(
  "unprotected direct component render reports missing admin access inline",
  (Page) => {
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Administrator access is required",
    );
  },
);
it("rechecks mounted account creation after session account is deleted", async () => {
  login("admin", "admin");
  createUser({
    displayName: "Second",
    username: "second",
    password: "demo",
    role: "admin",
  });
  login("second", "demo");
  const user = userEvent.setup();
  mount("/users");
  await fill(user);
  saveUsers([]);
  await user.click(screen.getByRole("button", { name: "Create User" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Administrator access is required",
  );
  expect(getUsers()).toEqual([]);
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});
it("renders each statistic accent and zero as a real definition value", () => {
  render(
    <dl>
      {["primary", "secondary", "writers", "posts"].map((accent) => (
        <StatCard key={accent} label={accent} value={0} accent={accent} />
      ))}
    </dl>,
  );
  expect(screen.getAllByText("0", { selector: "dd" })).toHaveLength(4);
});
