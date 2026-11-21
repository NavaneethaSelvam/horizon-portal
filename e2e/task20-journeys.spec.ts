import { expect, type Page, test } from "@playwright/test";

const employee = {
  username: "employee.e2e@local.test",
  password: "Task20Test!2026",
};
const manager = {
  username: "manager.e2e@local.test",
  password: "Task20Test!2026",
};

async function login(page: Page, user: typeof employee) {
  await page.goto("/login");
  await page.locator("#username").fill(user.username);
  await page.locator("#password").fill(user.password);
  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url() === "http://127.0.0.1:3101/api/v1/auth/login" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  const loginResponse = await loginResponsePromise;
  if (!loginResponse.ok()) {
    throw new Error(`Login request failed with HTTP ${loginResponse.status()}`);
  }
  await page.waitForURL("http://127.0.0.1:3101/");
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}

test("employee can log in", async ({ page }) => {
  await login(page, employee);
  await expect(page).toHaveURL("http://127.0.0.1:3101/");
});

test("employee can apply for leave", async ({ page }) => {
  await login(page, employee);
  await page.goto("/leave");
  await expect(page.getByRole("heading", { name: "Leave Management" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Apply for leave" })).toBeVisible();

  await page.locator('select[name="type"]').selectOption("CL");
  await page.locator('input[name="start"]').fill("2027-01-18");
  await page.locator('input[name="end"]').fill("2027-01-18");
  await page.locator('textarea[name="reason"]').fill("Task 20 employee leave journey");
  await page.getByRole("button", { name: "Submit request" }).click();

  await expect(page.getByText("Leave request submitted successfully.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "2027-01-18" }).first()).toBeVisible();
});

test("manager can approve a leave request and employee receives a notification", async ({ page, browser }) => {
  await login(page, manager);
  await page.goto("/approvals");
  await expect(page.getByRole("heading", { name: "Approvals" })).toBeVisible();

  const fixtureRow = page.getByRole("row").filter({ hasText: "2027-01-12" });
  await expect(fixtureRow).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await fixtureRow.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Leave request approved.")).toBeVisible();

  const employeeContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3101",
  });
  const employeePage = await employeeContext.newPage();
  try {
    await login(employeePage, employee);
    await employeePage.goto("/notifications");
    await expect(employeePage.getByText("Your leave request was approved.")).toBeVisible();
  } finally {
    await employeeContext.close();
  }
});

test("employee can view a payslip", async ({ page }) => {
  await login(page, employee);
  await page.goto("/payslips");
  await expect(page.getByRole("heading", { name: "My Payslips" })).toBeVisible();
  await expect(page.getByText("2026-12-01")).toBeVisible();
  await expect(page.getByText("Net pay")).toBeVisible();
  await expect(page.getByText(/900/)).toBeVisible();
});

test("manager can move a task card", async ({ page }) => {
  await login(page, manager);
  await page.goto("/team-board");
  await expect(page.getByRole("heading", { name: "Team Board" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Drag task TASK-E2E" })).toBeVisible();

  const source = page.getByRole("button", { name: "Drag task TASK-E2E" });
  const target = page
    .getByRole("region", { name: "In Progress tasks" })
    .getByText("Drop tasks here");

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error("Unable to resolve drag source or target geometry.");
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 10 },
  );
  await page.mouse.up();

  await expect(
    page.getByText("Task TASK-E2E moved to In Progress successfully.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "In Progress tasks" })).toContainText("TASK-E2E");
});
