/** Verify administration contracts against real jsdom localStorage. */
import { it, expect, vi } from "vitest";
import { ADMIN_ID, login, getSession, register } from "../src/utils/auth";
import { getUsers, saveUsers, savePosts, getPosts } from "../src/utils/storage";
import { createPost } from "../src/utils/posts";
import {
  listUsers,
  validateUser,
  createUser,
  deleteUser,
  getStats,
} from "../src/utils/users";
const fields = {
  displayName: " Writer ",
  username: " writer ",
  password: " demo ",
  role: "user",
};

/** Establish current default admin rather than passing forged session props. */
function admin() {
  login("admin", "admin");
}

it("lists permanent admin once without saving it, using a documented Permanent date sentinel", () => {
  admin();
  expect(listUsers()).toEqual([
    expect.objectContaining({ id: ADMIN_ID, role: "admin", createdAt: null }),
  ]);
  expect(getUsers()).toEqual([]);
  const copy = listUsers();
  copy[0].displayName = "Changed";
  expect(listUsers()[0].displayName).toBe("Admin");
});

it.each(["user", "admin"])(
  "creates %s with trimmed names, exact plaintext password, UUID/date and unchanged session",
  (role) => {
    admin();
    const session = getSession();
    const account = createUser({ ...fields, role, userId: "forged" });
    expect(account).toMatchObject({
      displayName: "Writer",
      username: "writer",
      password: " demo ",
      role,
    });
    expect(account.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(new Date(account.createdAt).toISOString()).toBe(account.createdAt);
    expect(getUsers()).toEqual([account]);
    expect(listUsers()).toHaveLength(2);
    expect(getSession()).toEqual(session);
  },
);

for (const operation of [
  listUsers,
  () => validateUser(fields),
  () => createUser(fields),
  () => deleteUser("missing"),
  getStats,
]) {
  it.each(["guest", "writer", "forged", "deleted", "demoted"])(
    `${operation.name || "mutation"} rejects actual %s identity`,
    (identity) => {
      if (identity !== "guest") {
        const session = register({
          displayName: "Existing",
          username: "existing",
          password: "demo",
          confirmPassword: "demo",
        });
        if (identity === "forged")
          localStorage.setItem(
            "writespace_session",
            JSON.stringify({ ...session, role: "admin" }),
          );
        if (identity === "deleted") saveUsers([]);
        if (identity === "demoted") {
          saveUsers(getUsers().map((user) => ({ ...user, role: "admin" })));
          login("existing", "demo");
          saveUsers(getUsers().map((user) => ({ ...user, role: "user" })));
        }
      }
      const before = getUsers();
      expect(() => operation({ userId: ADMIN_ID, role: "admin" })).toThrow(
        "Administrator access is required",
      );
      expect(getUsers()).toEqual(before);
    },
  );
}

for (const field of ["displayName", "username", "password"]) {
  it.each([undefined, null, "", "   ", 0, false, {}, []])(
    `rejects invalid ${field} %j without saving`,
    (value) => {
      admin();
      const input = { ...fields, [field]: value };
      expect(validateUser(input)[field]).toContain("required");
      expect(() => createUser(input)).toThrow("required");
      expect(getUsers()).toEqual([]);
    },
  );
}
it.each([undefined, null, "", "Admin", "owner", 1, false, {}, []])(
  "rejects invalid role %j",
  (role) => {
    admin();
    expect(validateUser({ ...fields, role }).role).toBe(
      "Choose Admin or user.",
    );
    expect(() => createUser({ ...fields, role })).toThrow(
      "Choose Admin or user.",
    );
    expect(getUsers()).toEqual([]);
  },
);
it.each([undefined, null, false, 1, "text", []])(
  "rejects missing account fields %j with all four errors",
  (input) => {
    admin();
    expect(Object.keys(validateUser(input))).toHaveLength(4);
    expect(() => createUser(input)).toThrow("required");
    expect(getUsers()).toEqual([]);
  },
);
it("rejects reserved and exact trimmed duplicates but permits case-distinct usernames", () => {
  admin();
  const first = createUser(fields);
  for (const username of ["admin", " admin ", "writer", " writer "]) {
    expect(validateUser({ ...fields, username }).username).toBe(
      "Username is already taken.",
    );
    expect(() => createUser({ ...fields, username })).toThrow(
      "Username is already taken.",
    );
    expect(getUsers()).toEqual([first]);
  }
  createUser({ ...fields, username: "Writer" });
  createUser({ ...fields, username: "Admin" });
  expect(getUsers().map((user) => user.username)).toEqual([
    "writer",
    "Writer",
    "Admin",
  ]);
});
it("fails when UUID generation is absent, throws, invalid or collides without changing saved accounts", () => {
  admin();
  const first = createUser(fields);
  const cases = [
    undefined,
    () => {
      throw new Error("UUID failed");
    },
    () => "invalid",
    () => first.id,
  ];
  for (const randomUUID of cases) {
    vi.stubGlobal("crypto", { randomUUID });
    expect(() => createUser({ ...fields, username: "second" })).toThrow();
    expect(getUsers()).toEqual([first]);
  }
});
it.each(["create", "delete"])(
  "failed %s storage writes never mutate accounts or posts",
  (operation) => {
    admin();
    const account = createUser(fields);
    const post = createPost({ title: "Retained", content: "Text" });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() =>
      operation === "create"
        ? createUser({ ...fields, username: "second" })
        : deleteUser(account.id),
    ).toThrow("Unable to save data");
    expect(getUsers()).toEqual([account]);
    expect(getPosts()).toEqual([post]);
  },
);
it("allows a saved admin to create/delete others but protects default and current accounts", () => {
  admin();
  const second = createUser({ ...fields, username: "second", role: "admin" });
  login("second", " demo ");
  const writer = createUser(fields);
  expect(() => deleteUser(ADMIN_ID)).toThrow(
    "Default admin cannot be deleted.",
  );
  expect(() => deleteUser(second.id)).toThrow(
    "Current account cannot be deleted.",
  );
  deleteUser(writer.id);
  expect(getUsers()).toEqual([second]);
  expect(getSession().userId).toBe(second.id);
});
it.each([undefined, null, "", " ", {}, [], 1, false, "missing"])(
  "rejects missing delete target %j",
  (id) => {
    admin();
    const account = createUser(fields);
    expect(() => deleteUser(id)).toThrow("User not found.");
    expect(getUsers()).toEqual([account]);
  },
);
it("rereads accounts for mutations, retains deleted author posts and invalidates their old session", () => {
  admin();
  const writer = createUser(fields);
  login("writer", " demo ");
  const oldSession = getSession();
  const post = createPost({ title: "Attribution", content: "Retained text" });
  admin();
  const second = createUser({ ...fields, username: "second", role: "admin" });
  deleteUser(writer.id);
  expect(getUsers()).toEqual([second]);
  expect(getPosts()).toEqual([post]);
  expect(post.authorName).toBe("Writer");
  expect(() => deleteUser(writer.id)).toThrow("User not found.");
  localStorage.setItem("writespace_session", JSON.stringify(oldSession));
  expect(getSession()).toBeNull();
  expect(localStorage.getItem("writespace_session")).toBeNull();
});
it("counts actual posts, all accounts and role partitions, refreshing after deletion", () => {
  admin();
  expect(getStats()).toEqual({
    totalPosts: 0,
    totalUsers: 1,
    totalAdmins: 1,
    standardWriters: 0,
  });
  const writer = createUser(fields);
  createUser({ ...fields, username: "second", role: "admin" });
  createPost({ title: "One", content: "Text" });
  createPost({ title: "Two", content: "Text" });
  expect(getStats()).toEqual({
    totalPosts: 2,
    totalUsers: 3,
    totalAdmins: 2,
    standardWriters: 1,
  });
  deleteUser(writer.id);
  expect(getStats()).toEqual({
    totalPosts: 2,
    totalUsers: 2,
    totalAdmins: 2,
    standardWriters: 0,
  });
});
it("malformed collections degrade to permanent admin and zero posts", () => {
  admin();
  localStorage.setItem("writespace_users", "{}");
  localStorage.setItem("writespace_posts", "{");
  expect(getStats()).toEqual({
    totalPosts: 0,
    totalUsers: 1,
    totalAdmins: 1,
    standardWriters: 0,
  });
  expect(listUsers()).toHaveLength(1);
});
