"use server";

import "server-only";
import { noul } from "@typesafe-ai/sdk";
import { requireClient } from "@/lib/typesafe-client";

const QUESTION_ID = "is_billing";

function billingQuestion() {
  return noul(
    "Is this support ticket about billing, charges, invoices, or refunds?",
    {
      true: "The ticket is about a charge, invoice, refund, subscription cost, or payment method.",
      false: "The ticket is about something else, e.g. a bug, a feature request, or praise.",
    },
  );
}

export interface BillingVerdict {
  isBilling: boolean;
  noul: number;
}

export async function classifyBilling(apiKey: string, text: string): Promise<BillingVerdict> {
  const client = requireClient(apiKey);
  const trimmed = text.trim().slice(0, 500);
  if (!trimmed) throw new Error("No ticket text to classify.");

  const response = await client.systemOne({
    state: { ticket_text: trimmed },
    questions: { [QUESTION_ID]: billingQuestion() },
  });
  const answer = response.answers[QUESTION_ID];
  return { isBilling: answer.noul > 0.5, noul: answer.noul };
}
