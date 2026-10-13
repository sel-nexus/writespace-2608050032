/** Specify real desktop/mobile administration journeys; execution is deferred by request. */
import { test, expect } from "./fixtures";

/** Open either shared navigation only when the mobile toggle is visible. */
async function openNavigation(page) {
  const toggle = page.getByRole("button", { name: "Open menu" });
  if (await toggle.isVisible()) await toggle.click();
}
/** Navigate via the shared responsive workspace menu. */
async function workspaceLink(page, name) {
  await openNavigation(page);
  await page
    .getByRole("navigation", { name: "Workspace navigation" })
    .getByRole("link", { name, exact: true })
    .click();
}
/** Enter the dashboard via the logo and session-aware public navigation. */
async function dashboard(page) {
  await page.getByRole("link", { name: "WriteSpace", exact: true }).click();
  await openNavigation(page);
  await page
    .getByRole("link", { name: "Go to Dashboard", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Admin Dashboard" }),
  ).toBeVisible();
}
/** Sign out via the account disclosure, then click the public Login link. */
async function switchAccount(page, username, password) {
  await page.getByRole("button", { name: /Account options/ }).click();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await openNavigation(page);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Login", exact: true })
    .click();
  await signIn(page, username, password);
}
/** Fill actual login fields without bypassing identity persistence. */
async function signIn(page, username = "admin", password = "admin") {
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
}
/** Create an account using the visible form and assert its role-specific success. */
async function createAccount(page, username, displayName, role) {
  await page.getByLabel("Display Name", { exact: true }).fill(displayName);
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill("demo-only");
  await page.getByLabel("Role", { exact: true }).selectOption(role);
  await page.getByRole("button", { name: "Create User", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(
    `Created ${displayName} as ${role === "admin" ? "Admin" : "user"}.`,
  );
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue("");
}
/** Assert the definition value paired with an activity label. */
async function expectCount(page, label, value) {
  await expect(
    page.getByText(label, { exact: true }).locator("..").locator("dd"),
  ).toHaveText(String(value));
}

// Use an explicit :visible selector for Playwright 1.48, which predates locator.filter({ visible }).
/** Select a visible native delete button by exact accessible name. */
function visibleDelete(page, username) {
  return page
    .getByRole("button", { name: `Delete ${username}`, exact: true })
    .and(page.locator("button:visible"));
}

test("admin creates both roles, writers publish, second admin removes account but retains attribution and protects identities", async ({
  page,
}, testInfo) => {
  await page.goto("/login");
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: "Admin Dashboard" }),
  ).toBeVisible();
  await expectCount(page, "Total Posts", 0);
  await expectCount(page, "Total Users", 1);
  await expectCount(page, "Total Admins", 1);
  await expectCount(page, "Standard Writers", 0);
  await expect(
    page.getByText("No posts yet. Write the first post."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Manage Users", exact: true }).click();
  await expect(page.getByText(/No additional accounts yet/)).toBeVisible();
  await expect(visibleDelete(page, "admin")).toBeDisabled();
  await expect(visibleDelete(page, "admin")).toHaveAttribute(
    "title",
    "Default admin cannot be deleted.",
  );
  await page.getByRole("button", { name: "Create User", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(4);
  await createAccount(page, "journey-writer", "Journey Writer", "user");
  await createAccount(page, "second-admin", "Second Admin", "admin");
  const accounts = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("writespace_users")),
  );
  expect(accounts.map(({ username, role }) => ({ username, role }))).toEqual([
    { username: "journey-writer", role: "user" },
    { username: "second-admin", role: "admin" },
  ]);
  const writer = accounts.find(
    (account) => account.username === "journey-writer",
  );
  const second = accounts.find(
    (account) => account.username === "second-admin",
  );
  await page.reload();
  await expect(visibleDelete(page, "journey-writer")).toBeEnabled();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("writespace_users")),
    ),
  ).toEqual(accounts);
  await page
    .getByRole("link", { name: "Back to Dashboard", exact: true })
    .click();
  await expectCount(page, "Total Users", 3);
  await expectCount(page, "Total Admins", 2);
  await expectCount(page, "Standard Writers", 1);
  await page.getByRole("link", { name: "Write New Post", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Admin announcement");
  await page.getByLabel("Content", { exact: true }).fill("A real admin post.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Admin announcement", exact: true }),
  ).toBeVisible();
  await switchAccount(page, "journey-writer", "demo-only");
  await workspaceLink(page, "Write");
  await page.getByLabel("Title", { exact: true }).fill("Retained writer story");
  await page
    .getByLabel("Content", { exact: true })
    .fill("Writing survives account removal.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Retained writer story", exact: true }),
  ).toBeVisible();
  const savedPosts = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("writespace_posts")),
  );
  expect(
    savedPosts.find((post) => post.title === "Retained writer story"),
  ).toMatchObject({ authorId: writer.id, authorName: "Journey Writer" });
  await switchAccount(page, "second-admin", "demo-only");
  await expectCount(page, "Total Posts", 2);
  await page.getByRole("link", { name: "Manage Users", exact: true }).click();
  await expect(visibleDelete(page, "admin")).toBeDisabled();
  await expect(visibleDelete(page, "second-admin")).toBeDisabled();
  await expect(visibleDelete(page, "second-admin")).toHaveAttribute(
    "title",
    "Current account cannot be deleted.",
  );
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Their posts will be retained.");
    await dialog.dismiss();
  });
  await visibleDelete(page, "journey-writer").click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("writespace_users")),
    ),
  ).toEqual(accounts);
  await expect(visibleDelete(page, "journey-writer")).toBeEnabled();
  page.once("dialog", (dialog) => dialog.accept());
  await visibleDelete(page, "journey-writer").click();
  await expect(page.getByRole("status")).toHaveText(
    "Account deleted. Existing posts and attribution were retained.",
  );
  await expect(visibleDelete(page, "journey-writer")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("writespace_users")),
    ),
  ).toEqual([second]);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("writespace_posts")),
    ),
  ).toEqual(savedPosts);
  await page.reload();
  await expect(visibleDelete(page, "second-admin")).toBeDisabled();
  await page.screenshot({
    path: testInfo.outputPath("user-management.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Back to Dashboard", exact: true })
    .click();
  await expectCount(page, "Total Users", 2);
  await expectCount(page, "Total Admins", 2);
  await expectCount(page, "Standard Writers", 0);
  await expectCount(page, "Total Posts", 2);
  await page
    .getByRole("link", { name: "Retained writer story", exact: true })
    .click();
  await expect(
    page.getByRole("main").getByText("Journey Writer", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Writing survives account removal.", { exact: true }),
  ).toBeVisible();
  await dashboard(page);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Delete Admin announcement", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("writespace_posts")),
    ),
  ).toEqual(savedPosts);
  await expectCount(page, "Total Posts", 2);
  await page
    .getByRole("link", { name: "Edit Admin announcement", exact: true })
    .click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Admin announcement",
  );
  await page.getByRole("link", { name: "Cancel", exact: true }).click();
  await dashboard(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete Admin announcement", exact: true })
    .click();
  await expectCount(page, "Total Posts", 1);
  await page.reload();
  await expectCount(page, "Total Posts", 1);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("writespace_posts")),
    ),
  ).toEqual(
    savedPosts.filter((post) => post.title === "Retained writer story"),
  );
});

test("admin form rejects reserved and duplicate usernames while preserving editable input and stored accounts", async ({
  page,
}) => {
  await page.goto("/login");
  await signIn(page);
  await workspaceLink(page, "Users");
  await createAccount(page, "unique", "Unique Writer", "user");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("writespace_users")),
  );
  for (const username of [" admin ", " unique "]) {
    await page.getByLabel("Display Name", { exact: true }).fill("Unsaved");
    await page.getByLabel("Username", { exact: true }).fill(username);
    await page.getByLabel("Password", { exact: true }).fill("demo-only");
    await page.getByLabel("Role", { exact: true }).selectOption("admin");
    await page
      .getByRole("button", { name: "Create User", exact: true })
      .click();
    await expect(
      page.getByText("Username is already taken.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Username", { exact: true })).toHaveValue(
      username,
    );
    await expect(page.getByRole("status")).toBeEmpty();
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("writespace_users")),
      ),
    ).toEqual(saved);
  }
  await page.reload();
  await expect(visibleDelete(page, "unique")).toBeEnabled();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("writespace_users")),
    ),
  ).toEqual(saved);
});
