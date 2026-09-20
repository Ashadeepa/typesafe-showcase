"use server";

import "server-only";
import { choice } from "@typesafe-ai/sdk";
import { requireClient } from "@/lib/typesafe-client";
import type { TriageCategory } from "@/lib/triage-data";

const QUESTION_ID = "category";

function categoryQuestion() {
  return choice(
    "Which category does this support ticket belong in?",
    {
      billing: "About a charge, invoice, refund, subscription cost, or payment method.",
      bug: "Reports something broken, failing, crashing, or not working as expected.",
      feature: "Requests a new capability, improvement, or something the product doesn't do yet.",
      praise: "Compliments the product, a person, or the experience — no ask, no problem.",
    },
  );
}

export interface TriageVerdict {
  category: TriageCategory;
  confidence: number;
}

export async function classifyTicket(apiKey: string, text: string): Promise<TriageVerdict> {
  const client = requireClient(apiKey);
  const trimmed = text.trim().slice(0, 500);
  if (!trimmed) throw new Error("No ticket text to classify.");

  const response = await client.systemOne({
    state: { ticket_text: trimmed },
    questions: { [QUESTION_ID]: categoryQuestion() },
  });
  const answer = response.answers[QUESTION_ID];
  return { category: answer.choice as TriageCategory, confidence: answer.confidence };
}
