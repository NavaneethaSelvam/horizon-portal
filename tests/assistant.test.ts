import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  findBestFaq,
  getPersonalAssistantIntent,
  getStaticResponseIntent,
  isCompensationQuestion,
  isExplicitlyAboutAnotherPerson,
  isSharedEmployeeNameQuestion,
  type AssistantFaq,
} from "../src/lib/assistant-rules";

const faqs = JSON.parse(
  readFileSync("prisma/data/03_Data_Pack/hr_faq.json", "utf8"),
) as AssistantFaq[];

const faqQuestions = [
  ["How many casual leave days do I get?", "FAQ-01"],
  ["What is my annual sick leave entitlement?", "FAQ-02"],
  ["Explain earned leave accrual and carry forward", "FAQ-03"],
  ["Can I take unpaid leave?", "FAQ-04"],
  ["How long is paid maternity leave?", "FAQ-05"],
  ["What is the office hour schedule?", "FAQ-06"],
  ["Do we work on Saturday?", "FAQ-07"],
  ["How is overtime pay calculated?", "FAQ-08"],
  ["What date is salary credited?", "FAQ-09"],
  ["How do you calculate LOP?", "FAQ-10"],
] as const;

for (const [question, faqId] of faqQuestions) {
  test(`FAQ matching answers: ${question}`, () => {
    const answer = findBestFaq(question, faqs);
    assert.equal(answer?.faq_id, faqId);
    assert.ok(answer?.answer);
  });
}

test("personal questions only identify leave and payslip intents for the signed-in user", () => {
  assert.equal(getPersonalAssistantIntent("How much leave do I have?"), "leave_balance");
  assert.equal(getPersonalAssistantIntent("Show my last payslip"), "payslip_status");
  assert.equal(getPersonalAssistantIntent("Show Alice's payslip"), null);
});

test("how-to leave questions use their configured chatbot response intent", () => {
  assert.equal(getStaticResponseIntent("How do I apply for leave?"), "apply_leave_howto");
  assert.equal(getStaticResponseIntent("How much leave do I have?"), null);
});

test("other employee pay requests are recognized without identifying people by name", () => {
  const question = "What is my coworker's salary?";
  assert.equal(isCompensationQuestion(question), true);
  assert.equal(isExplicitlyAboutAnotherPerson(question), true);
  assert.equal(isExplicitlyAboutAnotherPerson("Show my manager's payslip"), true);
  assert.equal(isExplicitlyAboutAnotherPerson("I need Maria's pay"), true);
});

test("shared employee names require a unique identifier through an authorized workflow", () => {
  assert.equal(isSharedEmployeeNameQuestion("What if two employees share a name?"), true);
  assert.equal(isSharedEmployeeNameQuestion("What is my leave balance?"), false);
});

test("ambiguous FAQ matches and unknown questions safely fall back", () => {
  assert.equal(findBestFaq("benefits", faqs), null);
  assert.equal(findBestFaq("How do I teleport to Mars?", faqs), null);
});
