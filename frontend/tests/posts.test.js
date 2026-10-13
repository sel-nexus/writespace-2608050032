/** Exercise publishing service branches against actual isolated browser storage. */
import { describe, it, expect, vi } from "vitest";
import { login, register, getSession, clearSession } from "../src/utils/auth";
import { savePosts, saveUsers } from "../src/utils/storage";
import {
  createPost,
  getPosts,
  listPosts,
  findPost,
  sortPosts,
  postTimestamp,
  formatPostDate,
  canManagePost,
  updatePost,
  deletePost,
} from "../src/utils/posts";

/** Build a valid persisted post with an independently configurable date. */
function post(n, createdAt = "2024-01-15T12:00:00.000Z") {
  return {
    id: `${n}2345678-1234-4123-8123-123456789abc`,
    title: `Story ${n}`,
    content: "A thought",
    createdAt,
    authorId: "admin",
    authorName: "Admin",
  };
}

describe("createPost", () => {
  it("trims title only, assigns UUID/date and reads back persisted writer attribution", () => {
    const session = register({
      displayName: "Ada",
      username: "ada",
      password: "demo",
      confirmPassword: "demo",
    });
    const content = "  First line\n\n<script>literal</script>\n  ";
    const start = Date.now();
    const created = createPost({
      title: "  My thought  ",
      content,
      authorId: "admin",
      authorName: "Forged",
      session: { userId: "admin" },
    });
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(Date.parse(created.createdAt)).toBeGreaterThanOrEqual(start);
    expect(Date.parse(created.createdAt)).toBeLessThanOrEqual(Date.now());
    expect(created).toMatchObject({
      title: "My thought",
      content,
      authorId: session.userId,
      authorName: "Ada",
    });
    expect(getPosts()).toEqual([created]);
    expect(findPost(created.id)).toEqual(created);
    expect(JSON.parse(localStorage.getItem("writespace_posts"))).toEqual([
      created,
    ]);
  });
  it("uses permanent admin attribution and retains existing posts and duplicate titles", () => {
    login("admin", "admin");
    savePosts([post(1)]);
    const created = createPost({ title: "Story 1", content: "New text" });
    expect(created).toMatchObject({ authorId: "admin", authorName: "Admin" });
    expect(getPosts()).toEqual([post(1), created]);
  });
  it("derives current account name despite tampered saved session claims", () => {
    register({
      displayName: "Real Writer",
      username: "writer",
      password: "demo",
      confirmPassword: "demo",
    });
    const session = getSession();
    localStorage.setItem(
      "writespace_session",
      JSON.stringify({ ...session, displayName: "Forged", role: "admin" }),
    );
    expect(createPost({ title: "Title", content: "Content" })).toMatchObject({
      authorName: "Real Writer",
      authorId: session.userId,
    });
  });
  it.each([
    undefined,
    null,
    {},
    { content: "Text" },
    { title: "" },
    { title: " \n\t " },
    { title: 1 },
    { title: [] },
    { title: {} },
    { title: true },
  ])("rejects missing or invalid title %# without saving", (fields) => {
    login("admin", "admin");
    expect(() => createPost(fields)).toThrow("Title is required.");
    expect(getPosts()).toEqual([]);
  });
  it.each([undefined, null, "", " \n\t ", 1, [], {}, true])(
    "rejects missing or invalid content %# without saving",
    (content) => {
      login("admin", "admin");
      expect(() => createPost({ title: "Title", content })).toThrow(
        "Content is required.",
      );
      expect(getPosts()).toEqual([]);
    },
  );
  it("rejects caller session when no actual current session exists", () => {
    expect(() =>
      createPost({
        title: "Title",
        content: "Text",
        session: { userId: "admin", role: "admin" },
      }),
    ).toThrow("Please log in again");
    expect(getPosts()).toEqual([]);
  });
  it.each([
    "{",
    "{}",
    "null",
    JSON.stringify({
      userId: "admin",
      username: "other",
      displayName: "Admin",
      role: "admin",
    }),
  ])("fails closed on invalid stored session %#", (raw) => {
    localStorage.setItem("writespace_session", raw);
    expect(() => createPost({ title: "Title", content: "Text" })).toThrow(
      "Please log in again",
    );
    expect(getPosts()).toEqual([]);
  });
  it("rejects a deleted account and a cleared session even when caller retains identity", () => {
    const session = register({
      displayName: "Ada",
      username: "ada",
      password: "demo",
      confirmPassword: "demo",
    });
    saveUsers([]);
    expect(() =>
      createPost({ title: "Title", content: "Text", session }),
    ).toThrow("Please log in again");
    login("admin", "admin");
    clearSession();
    expect(() =>
      createPost({ title: "Title", content: "Text", session }),
    ).toThrow("Please log in again");
    expect(getPosts()).toEqual([]);
  });
  it.each([undefined, {}, { randomUUID: "not callable" }])(
    "reports unavailable UUID capability %# without saving",
    (crypto) => {
      login("admin", "admin");
      vi.stubGlobal("crypto", crypto);
      expect(() => createPost({ title: "Title", content: "Text" })).toThrow(
        "This browser cannot create a post",
      );
      expect(getPosts()).toEqual([]);
    },
  );
  it("propagates UUID generation failure and never persists", () => {
    login("admin", "admin");
    vi.stubGlobal("crypto", {
      randomUUID() {
        throw new Error("UUID failed");
      },
    });
    expect(() => createPost({ title: "Title", content: "Text" })).toThrow(
      "UUID failed",
    );
    expect(getPosts()).toEqual([]);
  });
  it("rejects invalid generated data through savePosts instead of false success", () => {
    login("admin", "admin");
    vi.stubGlobal("crypto", { randomUUID: () => "invalid" });
    expect(() => createPost({ title: "Title", content: "Text" })).toThrow(
      "Cannot save invalid data",
    );
    expect(getPosts()).toEqual([]);
  });
  it("propagates failed storage writes and preserves the previous collection", () => {
    login("admin", "admin");
    savePosts([post(1)]);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => createPost({ title: "Title", content: "Text" })).toThrow(
      "Unable to save data. Enable browser storage",
    );
    expect(getPosts()).toEqual([post(1)]);
  });
  it("fails closed when storage reads become unavailable", () => {
    login("admin", "admin");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => createPost({ title: "Title", content: "Text" })).toThrow(
      "Please log in again",
    );
    expect(listPosts()).toEqual([]);
    expect(findPost(post(1).id)).toBeNull();
  });
  it("preserves a large plain-text payload without imposing unspecified limits", () => {
    login("admin", "admin");
    const content = "<img src=x onerror=alert(1)>\n" + "word ".repeat(20000);
    const created = createPost({ title: "Large", content });
    expect(findPost(created.id).content).toBe(content);
  });
});

/** Register a real writer for permission tests. */
function writer(username) {
  return register({
    displayName: username,
    username,
    password: "demo",
    confirmPassword: "demo",
  });
}

describe("post management", () => {
  it.each(["owner", "other", "admin", "guest"])(
    "enforces %s management and persists only allowed operations",
    (role) => {
      const owner = writer("owner");
      const original = createPost({
        title: "Original",
        content: "Original text",
      });
      const other = writer("other");
      if (role === "owner") login("owner", "demo");
      if (role === "admin") login("admin", "admin");
      if (role === "guest") clearSession();
      const allowed = role === "owner" || role === "admin";
      expect(canManagePost(original)).toBe(allowed);
      expect(
        canManagePost(original, {
          ...other,
          userId: owner.userId,
          role: "admin",
        }),
      ).toBe(role === "owner");
      if (allowed) {
        const updated = updatePost(original.id, {
          title: "  Revised  ",
          content: "  <script>literal</script>\n",
          id: "forged",
          authorId: "admin",
          authorName: "Forged",
          createdAt: "forged",
          session: other,
        });
        expect(updated).toEqual({
          ...original,
          title: "Revised",
          content: "  <script>literal</script>\n",
        });
        expect(findPost(original.id)).toEqual(updated);
        expect(getPosts()).toEqual([updated]);
        deletePost(original.id);
        expect(findPost(original.id)).toBeNull();
        expect(getPosts()).toEqual([]);
      } else {
        expect(() =>
          updatePost(original.id, { title: "Changed", content: "Changed" }),
        ).toThrow(role === "guest" ? "Please log in again" : "permission");
        expect(() => deletePost(original.id)).toThrow(
          role === "guest" ? "Please log in again" : "permission",
        );
        expect(getPosts()).toEqual([original]);
      }
    },
  );
  it("ignores elevated stored claims and rechecks changed current account roles", () => {
    writer("owner");
    const original = createPost({ title: "Original", content: "Text" });
    const other = writer("other");
    localStorage.setItem(
      "writespace_session",
      JSON.stringify({ ...other, role: "admin" }),
    );
    expect(canManagePost(original, { ...other, role: "admin" })).toBe(false);
    expect(() => deletePost(original.id)).toThrow("permission");
    const users = JSON.parse(localStorage.getItem("writespace_users"));
    saveUsers(
      users.map((user) =>
        user.id === other.userId ? { ...user, role: "admin" } : user,
      ),
    );
    expect(canManagePost(original)).toBe(true);
    updatePost(original.id, { title: "Moderated", content: "Text" });
    saveUsers(users);
    expect(() => deletePost(original.id)).toThrow("permission");
    expect(findPost(original.id).title).toBe("Moderated");
  });
  it("rejects stale deleted-account identity for both mutations", () => {
    const session = writer("owner");
    const original = createPost({ title: "Title", content: "Text" });
    saveUsers([]);
    expect(canManagePost(original, session)).toBe(false);
    expect(() =>
      updatePost(original.id, { title: "Changed", content: "Text" }),
    ).toThrow("Please log in again");
    expect(() => deletePost(original.id)).toThrow("Please log in again");
    expect(getPosts()).toEqual([original]);
    expect(getSession()).toBeNull();
  });
  it.each([undefined, null, "", " ", 1, {}, [], "missing", "../post"])(
    "rejects invalid/missing target %# without changing state",
    (id) => {
      login("admin", "admin");
      savePosts([post(1)]);
      expect(() => updatePost(id, { title: "Title", content: "Text" })).toThrow(
        "Post not found",
      );
      expect(() => deletePost(id)).toThrow("Post not found");
      expect(getPosts()).toEqual([post(1)]);
    },
  );
  it.each([
    undefined,
    null,
    {},
    { content: "Text" },
    { title: "" },
    { title: " " },
    { title: 1 },
    { title: [] },
    { title: {} },
  ])("rejects invalid edit title %#", (fields) => {
    login("admin", "admin");
    savePosts([post(1)]);
    expect(() => updatePost(post(1).id, fields)).toThrow("Title is required");
    expect(getPosts()).toEqual([post(1)]);
  });
  it.each([undefined, null, "", " \n ", 1, [], {}, true])(
    "rejects invalid edit content %#",
    (content) => {
      login("admin", "admin");
      savePosts([post(1)]);
      expect(() => updatePost(post(1).id, { title: "Title", content })).toThrow(
        "Content is required",
      );
      expect(getPosts()).toEqual([post(1)]);
    },
  );
  it.each(["update", "delete"])(
    "reports failed %s writes and preserves the collection",
    (operation) => {
      login("admin", "admin");
      savePosts([post(1), post(2)]);
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("quota");
      });
      expect(() =>
        operation === "update"
          ? updatePost(post(1).id, { title: "Changed", content: "Text" })
          : deletePost(post(1).id),
      ).toThrow("Unable to save data");
      expect(getPosts()).toEqual([post(1), post(2)]);
    },
  );
  it("fails closed on unavailable session reads and invalid permission inputs", () => {
    login("admin", "admin");
    expect(canManagePost(null)).toBe(false);
    expect(canManagePost({})).toBe(false);
    expect(canManagePost(post(1), null)).toBe(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(canManagePost(post(1))).toBe(false);
    expect(() =>
      updatePost(post(1).id, { title: "Title", content: "Text" }),
    ).toThrow("Please log in again");
    expect(() => deletePost(post(1).id)).toThrow("Please log in again");
  });
  it("retains unrelated posts and permits duplicate titles and large plain text edits", () => {
    login("admin", "admin");
    savePosts([post(1), post(2)]);
    const content = "<img src=x>\n" + "word ".repeat(20000);
    updatePost(post(1).id, { title: post(2).title, content });
    expect(getPosts()).toEqual([
      { ...post(1), title: post(2).title, content },
      post(2),
    ]);
    deletePost(post(1).id);
    expect(getPosts()).toEqual([post(2)]);
  });
});

describe("reading helpers", () => {
  it("reads empty, malformed and invalid collections gracefully", () => {
    expect(getPosts()).toEqual([]);
    expect(listPosts()).toEqual([]);
    localStorage.setItem("writespace_posts", "{");
    expect(listPosts()).toEqual([]);
    localStorage.setItem("writespace_posts", '[{"id":"broken"}]');
    expect(getPosts()).toEqual([]);
  });
  it("lists newest first with ascending ID ties and does not mutate input", () => {
    const records = [post(3), post(2, "2024-02-01T12:00:00.000Z"), post(1)];
    savePosts(records);
    expect(listPosts().map((item) => item.id)).toEqual([
      post(2).id,
      post(1).id,
      post(3).id,
    ]);
    expect(getPosts()).toEqual(records);
    expect(sortPosts(records).map((item) => item.id)).toEqual([
      post(2).id,
      post(1).id,
      post(3).id,
    ]);
    expect(records[0].id).toBe(post(3).id);
  });
  it("sorts invalid dates last with deterministic equal-date and equal-ID branches", () => {
    const records = [
      post(3, "bad"),
      post(2, ""),
      post(1, "1970-01-01T00:00:00.000Z"),
      post(1, "1970-01-01T00:00:00.000Z"),
    ];
    expect(sortPosts(records).map((item) => item.id)).toEqual([
      post(1).id,
      post(1).id,
      post(2).id,
      post(3).id,
    ]);
    expect(sortPosts(undefined)).toEqual([]);
    expect(sortPosts({})).toEqual([]);
    expect(sortPosts([])).toEqual([]);
  });
  it("finds exact stored IDs and returns null for unknown or invalid identifiers", () => {
    savePosts([post(1)]);
    expect(findPost(post(1).id)).toEqual(post(1));
    for (const id of [
      undefined,
      null,
      "",
      "  ",
      123,
      {},
      "missing",
      ` ${post(1).id}`,
    ])
      expect(findPost(id)).toBeNull();
  });
  it.each([undefined, null, "", " \n ", 0, {}, [], "not a date"])(
    "handles invalid date %# without throwing",
    (value) => {
      expect(postTimestamp(value)).toBe(-Infinity);
      expect(formatPostDate(value)).toBe("Date unavailable");
    },
  );
  it("formats padded local English dates including epoch and leap days", () => {
    expect(postTimestamp("1970-01-01T00:00:00.000Z")).toBe(0);
    expect(formatPostDate(new Date(2024, 0, 5, 12).toISOString())).toBe(
      "Jan 05, 2024",
    );
    expect(formatPostDate(new Date(2024, 1, 29, 12).toISOString())).toBe(
      "Feb 29, 2024",
    );
    expect(formatPostDate(new Date(2024, 11, 31, 12).toISOString())).toBe(
      "Dec 31, 2024",
    );
  });
});
