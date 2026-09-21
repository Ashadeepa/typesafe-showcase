"use server";

import "server-only";
import { noul } from "@typesafe-ai/sdk";
import { z } from "zod";
import { requireClient } from "@/lib/typesafe-client";
import { askModel, type CompareProvider } from "@/lib/compare-model";

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

export interface CompareBillingVerdict {
  isBilling: boolean;
  probability: number;
  latencyMs: number;
  costUsd: number;
}

const BillingSchema = z.object({ is_billing_probability: z.number() });
const BILLING_GEMINI_SCHEMA = {
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

/** Same billing judgment, asked of the chosen comparison model instead of Jev — purely for a latency comparison, never part of the race itself. */
export async function classifyBillingCompare(provider: CompareProvider, apiKey: string, text: string): Promise<CompareBillingVerdict> {
  const trimmed = text.trim().slice(0, 500);
  if (!trimmed) throw new Error("No ticket text to classify.");
  const call = await askModel(provider, apiKey, billingPrompt(trimmed), { gemini: BILLING_GEMINI_SCHEMA, zod: BillingSchema });
  return {
    isBilling: call.value.is_billing_probability > 0.5,
    probability: call.value.is_billing_probability,
    latencyMs: call.latencyMs,
    costUsd: call.costUsd,
  };
}
