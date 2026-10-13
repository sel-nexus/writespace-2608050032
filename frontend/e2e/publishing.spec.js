/** Exercise real UI publishing; shared fixtures capture browser errors per test. */
import { test, expect } from "./fixtures";

test("register, validate, publish, read, list and reload browser-local writing", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Get Started Free" }).click();
  await page.getByLabel("Display Name").fill("Publishing Writer");
  await page.getByLabel("Username").fill("publishing-writer");
  await page.getByLabel("Password", { exact: true }).fill("demo-only");
  await page.getByLabel("Confirm Password").fill("demo-only");
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(
    page.getByText("No blogs yet. Be the first to write one!"),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("link", { name: "Write", exact: true })
    .click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Title is required.")).toBeVisible();
  await expect(page.getByText("Content is required.")).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  const content =
    "  A browser-local thought.\n\n<script>literal text, not code</script>\nLast line.  ";
  await page.getByLabel("Title").fill("  A published thought  ");
  await page.getByLabel("Content").fill(content);
  await expect(page.getByText(`${content.length} characters`)).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/blog\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", { name: "A published thought" }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText("Publishing Writer", { exact: true }),
  ).toBeVisible();
  expect(await page.locator("p.whitespace-pre-wrap").textContent()).toBe(
    content,
  );
  await expect(page.getByRole("main").locator("script")).toHaveCount(0);
  const stored = await page.evaluate(() => ({
    posts: JSON.parse(localStorage.getItem("writespace_posts")),
    session: JSON.parse(localStorage.getItem("writespace_session")),
    users: JSON.parse(localStorage.getItem("writespace_users")),
  }));
  expect(stored.posts).toHaveLength(1);
  const post = stored.posts[0];
  expect(post).toMatchObject({
    title: "A published thought",
    content,
    authorId: stored.session.userId,
    authorName: "Publishing Writer",
  });
  expect(post.authorId).toBe(stored.users[0].id);
  expect(post.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  expect(new Date(post.createdAt).toISOString()).toBe(post.createdAt);
  await page.screenshot({
    path: testInfo.outputPath("published-reader.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Back to All Posts" }).click();
  await expect(
    page
      .getByRole("region", { name: "All posts" })
      .getByRole("heading", { name: post.title }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: post.title })).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("writespace_posts")),
    ),
  ).toEqual([post]);
  await page
    .getByRole("region", { name: "All posts" })
    .getByRole("link", { name: /A published thought/ })
    .click();
  expect(await page.locator("p.whitespace-pre-wrap").textContent()).toBe(
    content,
  );
  await page.reload();
  expect(await page.locator("p.whitespace-pre-wrap").textContent()).toBe(
    content,
  );
  await page
    .getByRole("navigation", { name: "Publishing navigation" })
    .getByRole("link", { name: "Write", exact: true })
    .click();
  await page.getByLabel("Title").fill("Do not save");
  await page.getByLabel("Content").fill("Cancelled text");
  await page.getByRole("link", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("writespace_posts")),
    ),
  ).toEqual([post]);
  await page.getByRole("button", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Start Reading" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("guest direct writing entry requires login", async ({ page }) => {
  await page.goto("/write");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Login", exact: true }),
  ).toBeVisible();
});
