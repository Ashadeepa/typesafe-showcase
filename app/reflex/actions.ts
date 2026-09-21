"use server";

import "server-only";
import { noul } from "@typesafe-ai/sdk";
import { requireClient } from "@/lib/typesafe-client";
import { askGemini } from "@/lib/gemini";

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

export interface GeminiBillingVerdict {
  isBilling: boolean;
  probability: number;
  latencyMs: number;
  costUsd: number;
}

const BILLING_SCHEMA = {
  type: "object",
  properties: { is_billing_probability: { type: "number" } },
  required: ["is_billing_probability"],
};

function billingPrompt(ticketText: string) {
  return (
    "Is this support ticket about billing, charges, invoices, or refunds? " +
    `Ticket: "${ticketText}". ` +
    'Respond with only a JSON object: {"is_billing_probability": <number between 0 and 1>}.'
  );
}

/** Same billing judgment, asked of Gemini instead of Jev — purely for a latency comparison, never part of the race itself. */
export async function classifyBillingGemini(geminiApiKey: string, text: string): Promise<GeminiBillingVerdict> {
  const trimmed = text.trim().slice(0, 500);
  if (!trimmed) throw new Error("No ticket text to classify.");
  const call = await askGemini<{ is_billing_probability: number }>(geminiApiKey, billingPrompt(trimmed), BILLING_SCHEMA);
  return {
    isBilling: call.value.is_billing_probability > 0.5,
    probability: call.value.is_billing_probability,
    latencyMs: call.latencyMs,
    costUsd: call.costUsd,
  };
}
