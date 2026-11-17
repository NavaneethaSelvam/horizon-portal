export type AssistantFaq = {
  faq_id?: string;
  question: string;
  answer: string;
  category?: string | null;
};

const ignoredWords = new Set([
  "a", "an", "and", "are", "as", "can", "do", "does", "for", "get",
  "have", "how", "i", "in", "is", "it", "many", "me", "of", "on",
  "the", "to", "we", "what", "when", "who", "with", "you", "your",
]);

const canonicalWords: Record<string, string> = {
  accrual: "accrue",
  accrues: "accrue",
  accrued: "accrue",
  calculate: "calculate",
  calculated: "calculate",
  calculations: "calculate",
  credited: "paid",
  credit: "paid",
  days: "day",
  leaves: "leave",
  hours: "hour",
  payday: "paid",
  unpaid: "unpaid",
  without: "unpaid",
  saturdays: "saturday",
  sundays: "sunday",
  salaries: "salary",
  salary: "salary",
  weekends: "weekend",
};

function getTokens(value: string) {
  return value
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.map((word) => canonicalWords[word] ?? word)
    .filter((word) => word.length > 1 && !ignoredWords.has(word)) ?? [];
}

export function findBestFaq<T extends AssistantFaq>(
  question: string,
  faqs: T[],
): T | null {
  const queryTokens = new Set(getTokens(question));
  if (!queryTokens.size) return null;

  const matches = faqs.map((faq) => {
    const faqTokens = new Set(getTokens(faq.question));
    const categoryTokens = new Set(getTokens(faq.category ?? ""));
    const questionOverlap = [...queryTokens].filter((token) => faqTokens.has(token)).length;
    const categoryOverlap = [...queryTokens].filter((token) => categoryTokens.has(token)).length;
    const hasDistinctWeekendTerm =
      /\b(saturday|sunday|weekend)\b/i.test(question) &&
      [...queryTokens].some((token) =>
        ["saturday", "sunday", "weekend"].includes(token) && faqTokens.has(token)
      );
    return {
      faq,
      score: questionOverlap + categoryOverlap * 0.25,
      questionOverlap,
      ratio: questionOverlap / queryTokens.size,
      hasDistinctWeekendTerm,
    };
  }).filter((match) =>
    (match.questionOverlap >= 2 && match.ratio >= 0.3) ||
    (match.questionOverlap === 1 && match.hasDistinctWeekendTerm)
  )
    .sort((left, right) => right.score - left.score || right.ratio - left.ratio);

  if (!matches.length) return null;
  if (
    matches.length > 1 &&
    matches[0].score === matches[1].score &&
    matches[0].ratio === matches[1].ratio
  ) {
    return null;
  }
  return matches[0].faq;
}

export type PersonalAssistantIntent = "leave_balance" | "payslip_status";

export function getPersonalAssistantIntent(
  question: string,
): PersonalAssistantIntent | null {
  const value = question.toLowerCase();
  const asksAboutSelf = /\b(my|me|mine|i)\b/.test(value);
  if (!asksAboutSelf) return null;

  if (
    /\b(leave|cl|sl|el)\b/.test(value) &&
    /\b(balance|remaining|available|left|much)\b/.test(value)
  ) {
    return "leave_balance";
  }

  if (/\b(payslip|paycheck|salary|net pay|gross pay)\b/.test(value)) {
    return "payslip_status";
  }

  return null;
}

export function getStaticResponseIntent(question: string) {
  if (
    /\b(apply|submit|request)\b.{0,40}\bleave\b/i.test(question) ||
    /\bleave\b.{0,40}\b(apply|submit|request)\b/i.test(question)
  ) {
    return "apply_leave_howto";
  }
  return null;
}

export function isCompensationQuestion(question: string) {
  return /\b(salary|salaries|pay|payslip|paycheck|wage|compensation|earnings|earn)\b/i.test(question);
}

export function isExplicitlyAboutAnotherPerson(question: string) {
  const compensationNoun = "(?:salary|pay|payslip|paycheck|wage|compensation|earnings)";
  const relationship =
    /\b(other|someone|coworker|colleague|teammate|team member|employee|manager|supervisor|boss|direct report|sister|brother|spouse|partner|wife|husband|friend|their|his|her|staff|everyone|all employees)\b/i;
  const namedPossessor = new RegExp(
    `\\b[A-Z][A-Za-z'-]+(?:\\s+[A-Z][A-Za-z'-]+)?['’]s\\s+${compensationNoun}\\b`,
  );
  const namedTarget = new RegExp(
    `\\b${compensationNoun}\\s+(?:of|for|to)\\s+[A-Z][A-Za-z'-]+\\b`,
  );
  return relationship.test(question) || namedPossessor.test(question) || namedTarget.test(question);
}

export function isSharedEmployeeNameQuestion(question: string) {
  return (
    /\b(two|multiple|same|shared|duplicate)\b/i.test(question) &&
    /\b(name|names)\b/i.test(question)
  );
}
