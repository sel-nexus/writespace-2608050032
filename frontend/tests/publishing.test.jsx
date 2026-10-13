/** Verify publishing components and real route flows with browser-local persistence. */
import { it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import App from "../src/App";
import Home from "../src/pages/Home";
import ReadBlog from "../src/pages/ReadBlog";
import WriteBlog from "../src/pages/WriteBlog";
import { BlogCard } from "../src/components/BlogCard";
import { login, register, clearSession } from "../src/utils/auth";
import { savePosts, getPosts } from "../src/utils/storage";

/** Build a schema-valid post fixture. */
function post(n, overrides = {}) {
  return {
    id: `${n}2345678-1234-4123-8123-123456789abc`,
    title: `Story ${n}`,
    content: "First line\n\nLast line",
    authorId: "admin",
    authorName: "Admin",
    createdAt: `2024-01-0${n}T12:00:00.000Z`,
    ...overrides,
  };
}
/** Expose navigation outcomes as accessible text. */
function Location() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}
/** Mount the real application from one test entry route. */
function mount(path = "/blogs") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Location />
    </MemoryRouter>,
  );
}
/** Mount a component with route context without requiring application identity. */
function component(element, path = "/blogs") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/blogs" element={<Home />} />
        <Route path="/blog/:id" element={<ReadBlog />} />
        <Route path="/write" element={<WriteBlog />} />
        <Route path="/" element={element} />
      </Routes>
      <Location />
    </MemoryRouter>,
  );
}

it("shows empty Home invitation and navigates its Write CTA", async () => {
  const user = userEvent.setup();
  component(null);
  expect(screen.getByRole("heading", { name: "All Blogs" })).toBeVisible();
  expect(
    screen.getByText("No blogs yet. Be the first to write one!"),
  ).toBeVisible();
  await user.click(screen.getByRole("link", { name: "Write" }));
  expect(screen.getByRole("heading", { name: "Write a post" })).toBeVisible();
  expect(screen.getByLabelText("Current route")).toHaveTextContent("/write");
});
it.each(["{", '[{"title":{}}]'])(
  "shows graceful empty Home with malformed posts %s",
  (raw) => {
    localStorage.setItem("writespace_posts", raw);
    component(null);
    expect(
      screen.getByText("No blogs yet. Be the first to write one!"),
    ).toBeVisible();
  },
);
it("shows graceful empty Home when storage reads are blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  component(null);
  expect(
    screen.getByText("No blogs yet. Be the first to write one!"),
  ).toBeVisible();
});
it("renders newest-first responsive grid with tie order and opens the selected post", async () => {
  const user = userEvent.setup();
  savePosts([post(1), post(3), post(2, { createdAt: post(3).createdAt })]);
  component(null);
  const grid = screen.getByRole("region", { name: "All posts" });
  expect(grid).toHaveClass("grid-cols-1", "md:grid-cols-2", "lg:grid-cols-3");
  expect(
    within(grid)
      .getAllByRole("heading")
      .map((heading) => heading.textContent),
  ).toEqual(["Story 2", "Story 3", "Story 1"]);
  await user.click(within(grid).getByRole("link", { name: /Story 2/ }));
  expect(screen.getByRole("heading", { name: "Story 2" })).toBeVisible();
  expect(screen.getByLabelText("Current route")).toHaveTextContent(
    `/blog/${post(2).id}`,
  );
});
it.each([0, 1, 2, 3, 4])(
  "cycles card border at index %i and displays excerpt/date/author",
  (index) => {
    const content = "x".repeat(120) + "excluded suffix";
    const view = render(
      <MemoryRouter>
        <BlogCard post={post(1, { content })} index={index} />
      </MemoryRouter>,
    );
    expect(view.container.querySelector("article")).toHaveClass(
      [
        "border-t-primary-500",
        "border-t-secondary-500",
        "border-t-pink-500",
        "border-t-teal-500",
      ][index % 4],
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `/blog/${post(1).id}`,
    );
    expect(screen.getByText("x".repeat(120))).toBeVisible();
    expect(screen.queryByText(/excluded suffix/)).not.toBeInTheDocument();
    expect(screen.getByText("Jan 01, 2024")).toBeVisible();
    expect(screen.getByText("Admin")).toBeVisible();
    expect(screen.getByText("👑")).toHaveAttribute("aria-hidden", "true");
  },
);
it("uses default card index, book glyph, short excerpt and literal markup", () => {
  const content = "<script>window.bad = true</script>";
  const view = render(
    <MemoryRouter>
      <BlogCard
        post={post(1, {
          content,
          title: "<img src=x>",
          authorId: post(2).id,
          authorName: "Writer",
        })}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading")).toHaveTextContent("<img src=x>");
  expect(screen.getByText(content)).toBeVisible();
  expect(screen.getByText("📚")).toBeVisible();
  expect(screen.getByText("Writer")).toBeVisible();
  expect(view.container.querySelector("script, img")).toBeNull();
  expect(view.container.querySelector("article")).toHaveClass(
    "border-t-primary-500",
  );
});
it("reads full escaped plain text with preserved newlines, date and only a Back link", async () => {
  const user = userEvent.setup();
  const content =
    "  <script>alert(1)</script>\n\n" + "long word ".repeat(2000) + "\n  end  ";
  savePosts([post(1, { title: "<img src=x>", content })]);
  const view = component(null, `/blog/${post(1).id}`);
  const body = view.container.querySelector("p.whitespace-pre-wrap");
  expect(body.textContent).toBe(content);
  expect(body).toHaveClass("whitespace-pre-wrap", "break-words");
  expect(screen.getByRole("heading")).toHaveTextContent("<img src=x>");
  expect(view.container.querySelector("script, img")).toBeNull();
  expect(screen.getByText("Admin")).toBeVisible();
  expect(screen.getByText("Jan 01, 2024")).toBeVisible();
  expect(
    screen.queryByRole("button", { name: /Edit|Delete/ }),
  ).not.toBeInTheDocument();
  expect(screen.getAllByRole("link")).toHaveLength(1);
  await user.click(screen.getByRole("link", { name: "Back to All Posts" }));
  expect(screen.getByLabelText("Current route")).toHaveTextContent("/blogs");
});
it("shows book authors in the reader", () => {
  savePosts([post(1, { authorId: post(2).id, authorName: "Writer" })]);
  component(null, `/blog/${post(1).id}`);
  expect(screen.getByText("Writer")).toBeVisible();
  expect(screen.getByText("📚")).toBeVisible();
});
it("handles an unknown ID with a recoverable back link", async () => {
  const user = userEvent.setup();
  component(null, "/blog/missing");
  expect(screen.getByRole("heading", { name: "Post not found" })).toBeVisible();
  await user.click(screen.getByRole("link", { name: "Back to All Posts" }));
  expect(screen.getByLabelText("Current route")).toHaveTextContent("/blogs");
});
it("handles a reader mounted with no ID", () => {
  component(<ReadBlog />, "/");
  expect(screen.getByRole("heading", { name: "Post not found" })).toBeVisible();
});
it("exposes required field errors and their associations, rejecting whitespace", async () => {
  const user = userEvent.setup();
  component(null, "/write");
  const title = screen.getByLabelText("Title");
  const content = screen.getByLabelText("Content");
  expect(content).toHaveClass("min-h-[256px]");
  expect(content).toHaveAttribute("aria-required", "true");
  expect(screen.getByText("0 characters")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getAllByRole("alert")).toHaveLength(2);
  expect(title).toHaveAttribute("aria-invalid", "true");
  expect(title).toHaveAttribute("aria-describedby", "title-error");
  expect(content).toHaveAttribute("aria-invalid", "true");
  expect(content).toHaveAttribute(
    "aria-describedby",
    "content-error content-count",
  );
  await user.type(title, " \t ");
  await user.type(content, " \n ");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getAllByRole("alert")).toHaveLength(2);
  expect(getPosts()).toEqual([]);
});
it.each(["Title", "Content"])(
  "validates missing %s independently",
  async (missing) => {
    const user = userEvent.setup();
    component(null, "/write");
    await user.type(
      screen.getByLabelText(missing === "Title" ? "Content" : "Title"),
      "Present",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent(
      `${missing} is required.`,
    );
    expect(getPosts()).toEqual([]);
  },
);
it("creates through App, preserves large content and reads/list/reloads saved attribution", async () => {
  const user = userEvent.setup();
  const session = register({
    displayName: "Ada",
    username: "ada",
    password: "demo",
    confirmPassword: "demo",
  });
  const view = mount("/write");
  const content =
    "  <img src=x onerror=alert(1)>\n\n" + "text ".repeat(10000) + "\n  ";
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "  My words  " },
  });
  fireEvent.change(screen.getByLabelText("Content"), {
    target: { value: content },
  });
  expect(screen.getByText(`${content.length} characters`)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Save" }));
  const saved = getPosts()[0];
  expect(saved).toMatchObject({
    title: "My words",
    content,
    authorId: session.userId,
    authorName: "Ada",
  });
  expect(screen.getByLabelText("Current route")).toHaveTextContent(
    `/blog/${saved.id}`,
  );
  expect(
    view.container.querySelector("p.whitespace-pre-wrap").textContent,
  ).toBe(content);
  expect(view.container.querySelector("img")).toBeNull();
  await user.click(screen.getByRole("link", { name: "Back to All Posts" }));
  expect(screen.getByRole("heading", { name: "My words" })).toBeVisible();
  view.unmount();
  mount("/blogs");
  expect(screen.getByRole("heading", { name: "My words" })).toBeVisible();
  expect(getPosts()).toEqual([saved]);
});
it("cancels with unsaved text without changing existing posts", async () => {
  login("admin", "admin");
  savePosts([post(1)]);
  const user = userEvent.setup();
  mount("/write");
  await user.type(screen.getByLabelText("Title"), "Unsaved");
  await user.type(screen.getByLabelText("Content"), "Unsaved content");
  await user.click(screen.getByRole("link", { name: "Cancel" }));
  expect(screen.getByLabelText("Current route")).toHaveTextContent("/blogs");
  expect(getPosts()).toEqual([post(1)]);
});
it("keeps input and route on persistence failure and permits a successful retry", async () => {
  login("admin", "admin");
  const user = userEvent.setup();
  mount("/write");
  await user.type(screen.getByLabelText("Title"), "Retained");
  await user.type(screen.getByLabelText("Content"), "My text");
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Unable to save data. Enable browser storage",
  );
  expect(screen.getByLabelText("Title")).toHaveValue("Retained");
  expect(screen.getByLabelText("Content")).toHaveValue("My text");
  expect(screen.getByLabelText("Current route")).toHaveTextContent("/write");
  expect(getPosts()).toEqual([]);
  spy.mockRestore();
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getByRole("heading", { name: "Retained" })).toBeVisible();
  expect(getPosts()).toHaveLength(1);
});
it("rejects expired identity at submit instead of trusting the mounted authenticated screen", async () => {
  login("admin", "admin");
  const user = userEvent.setup();
  mount("/write");
  await user.type(screen.getByLabelText("Title"), "Title");
  await user.type(screen.getByLabelText("Content"), "Text");
  clearSession();
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Please log in again");
  expect(getPosts()).toEqual([]);
});
it.each(["/blogs", "/write", "/blog/missing"])(
  "redirects guest %s to login",
  (path) => {
    mount(path);
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/login");
  },
);
it("keeps logout available on reader and clears identity", async () => {
  login("admin", "admin");
  savePosts([post(1)]);
  const user = userEvent.setup();
  mount(`/blog/${post(1).id}`);
  await user.click(screen.getByRole("button", { name: /Account options/ }));
  await user.click(screen.getByRole("button", { name: "Logout" }));
  expect(localStorage.getItem("writespace_session")).toBeNull();
  expect(screen.getByLabelText("Current route").textContent).toBe("/");
});
