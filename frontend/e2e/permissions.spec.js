/** Verify real cross-feature permission journeys using the browser-error fixture. */
import { test, expect } from "./fixtures";

/** Open the workspace mobile disclosure only where the trigger is visible. */
async function openNavigation(page) {
  const toggle = page.getByRole("button", { name: "Open menu" });
  if (await toggle.isVisible()) {
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(
      page.getByRole("button", { name: "Close menu" }),
    ).toHaveAttribute("aria-expanded", "true");
  }
}

/** Register through visible account controls rather than seeding the active identity. */
async function registerWriter(page) {
  await page.getByRole("link", { name: "Get Started Free" }).click();
  await page.getByLabel("Display Name").fill("Permission Writer");
  await page.getByLabel("Username").fill("permission-writer");
  await page.getByLabel("Password", { exact: true }).fill("demo-only");
  await page.getByLabel("Confirm Password").fill("demo-only");
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page).toHaveURL(/\/blogs$/);
}

/** Read actual persisted post state for transition assertions. */
async function posts(page) {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("writespace_posts")) || [],
  );
}

/** Preload a valid unrelated author and post once, without resetting reload persistence. */
async function otherAuthorFixture(page, withWriter = false) {
  await page.addInitScript((withWriter) => {
    if (localStorage.getItem("writespace_users") !== null) return;
    const author = {
      id: "22345678-1234-4123-8123-123456789abc",
      username: "second-author",
      displayName: "Second Author",
      role: "user",
      password: "demo-only",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    localStorage.setItem("writespace_users", JSON.stringify([author]));
    localStorage.setItem(
      "writespace_posts",
      JSON.stringify([
        {
          id: "12345678-1234-4123-8123-123456789abc",
          title: "Another author's story",
          content: "Retained second-author writing.",
          authorId: author.id,
          authorName: author.displayName,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ]),
    );
    if (withWriter) {
      const user = {
        id: "32345678-1234-4123-8123-123456789abc",
        username: "initial-writer",
        displayName: "Initial Writer",
        password: "demo-only",
        role: "user",
        createdAt: "2024-01-01T00:00:00.000Z",
      };
      localStorage.setItem("writespace_users", JSON.stringify([author, user]));
      localStorage.setItem(
        "writespace_session",
        JSON.stringify({
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          role: "admin",
        }),
      );
    }
  }, withWriter);
}

test("register, deny other-author controls, create, cancel, edit, confirm delete and logout", async ({
  page,
}, testInfo) => {
  await otherAuthorFixture(page);
  await page.goto("/");
  await registerWriter(page);
  const originalOther = (await posts(page))[0];
  const grid = page.getByRole("region", { name: "All posts" });
  await expect(grid.getByRole("link", { name: /Edit/ })).toHaveCount(0);
  await grid.getByRole("link", { name: /^Another author's story/ }).click();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Edit", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Back to All Posts" }),
  ).toBeVisible();
  await openNavigation(page);
  await page
    .getByRole("navigation", { name: "Workspace navigation" })
    .getByRole("link", { name: "Write", exact: true })
    .click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Title is required.")).toBeVisible();
  await expect(page.getByText("Content is required.")).toBeVisible();
  await page.getByLabel("Title").fill("My managed story");
  await page
    .getByLabel("Content")
    .fill("Original UI-created text.\nSecond line.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "My managed story" }),
  ).toBeVisible();
  const created = (await posts(page)).find(
    (post) => post.title === "My managed story",
  );
  const session = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("writespace_session")),
  );
  expect(created.authorId).toBe(session.userId);
  expect(created.authorName).toBe("Permission Writer");
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Title")).toHaveValue(created.title);
  await expect(page.getByLabel("Content")).toHaveValue(created.content);
  await page.getByLabel("Title").fill("Never saved");
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(
    page.getByRole("heading", { name: created.title }),
  ).toBeVisible();
  expect(await posts(page)).toEqual([originalOther, created]);
  await page.getByRole("link", { name: "Back to All Posts" }).click();
  await grid
    .getByRole("link", { name: "Edit My managed story", exact: true })
    .click();
  await page.getByLabel("Title").fill(" ");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Title is required.")).toBeVisible();
  expect(await posts(page)).toEqual([originalOther, created]);
  await page.getByLabel("Title").fill("Revised UI story");
  const content = "  Revised\n<script>still plain text</script>  ";
  await page.getByLabel("Content").fill(content);
  await expect(page.getByText(`${content.length} characters`)).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "Revised UI story" }),
  ).toBeVisible();
  const revised = { ...created, title: "Revised UI story", content };
  expect(await posts(page)).toEqual([originalOther, revised]);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: revised.title }),
  ).toBeVisible();
  expect(await page.locator("p.whitespace-pre-wrap").textContent()).toBe(
    content,
  );
  expect(await posts(page)).toEqual([originalOther, revised]);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Delete" }).click();
  expect(await posts(page)).toEqual([originalOther, revised]);
  await page.screenshot({
    path: testInfo.outputPath("permissions-reader.png"),
    fullPage: true,
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  expect(await posts(page)).toEqual([originalOther]);
  await page.reload();
  await expect(grid.getByRole("heading", { name: revised.title })).toHaveCount(
    0,
  );
  expect(await posts(page)).toEqual([originalOther]);
  await page.getByRole("button", { name: /Account options/ }).click();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate(() => localStorage.getItem("writespace_session")),
  ).toBeNull();
  await page.getByRole("link", { name: "Start Reading" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("admin logs in and moderates another author's writing", async ({
  page,
}) => {
  await otherAuthorFixture(page);
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await openNavigation(page);
  const nav = page.getByRole("navigation", { name: "Workspace navigation" });
  await expect(nav.getByRole("link", { name: "Users" })).toBeVisible();
  await nav.getByRole("link", { name: "All Blogs", exact: true }).click();
  const original = (await posts(page))[0];
  await page
    .getByRole("link", { name: `Edit ${original.title}`, exact: true })
    .click();
  await page.getByLabel("Title").fill("Admin revised story");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "Admin revised story" }),
  ).toBeVisible();
  expect(await posts(page)).toEqual([
    { ...original, title: "Admin revised story" },
  ]);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(
    page.getByText("No blogs yet. Be the first to write one!"),
  ).toBeVisible();
  expect(await posts(page)).toEqual([]);
});

for (const route of ["/edit/missing", "/blog/missing", "/users", "/admin"]) {
  test(`guest direct entry ${route} requires login`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Login", exact: true }),
    ).toBeVisible();
  });
}

for (const route of [
  "/edit/12345678-1234-4123-8123-123456789abc",
  "/admin",
  "/users",
]) {
  test(`writer direct unauthorized entry ${route} returns to blogs`, async ({
    page,
  }) => {
    await otherAuthorFixture(page, true);
    await page.goto(route);
    await expect(page).toHaveURL(/\/blogs$/);
    await expect(
      page.getByRole("heading", { name: "All Blogs", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
    expect((await posts(page))[0].title).toBe("Another author's story");
  });
}
