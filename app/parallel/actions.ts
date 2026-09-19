"use server";

import "server-only";
import { noul, type TypeSafeClient } from "@typesafe-ai/sdk";
import { TICKETS } from "@/lib/data";
import { requireClient } from "@/lib/typesafe-client";

export interface TicketResult {
  id: number;
  text: string;
  isBillingNoul: number;
}

export interface RunResult {
  results: TicketResult[];
  elapsedMs: number;
  inputTokens: number;
  outputTokens: number;
}

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

async function judgeOne(client: TypeSafeClient, ticket: { id: number; text: string }) {
  const response = await client.systemOne({
    state: { ticket_text: ticket.text },
    questions: { [QUESTION_ID]: billingQuestion() },
  });
  const answer = response.answers[QUESTION_ID];
  return {
    id: ticket.id,
    text: ticket.text,
    isBillingNoul: answer.noul,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

function summarize(rows: Awaited<ReturnType<typeof judgeOne>>[], elapsedMs: number): RunResult {
  return {
    results: rows.map(({ id, text, isBillingNoul }) => ({ id, text, isBillingNoul })),
    elapsedMs,
    inputTokens: rows.reduce((sum, r) => sum + r.inputTokens, 0),
    outputTokens: rows.reduce((sum, r) => sum + r.outputTokens, 0),
  };
}

const MAX_EXTRA_TICKETS = 10;
const MAX_TICKET_LENGTH = 500;

function buildTicketList(extraTicketTexts: string[]) {
  const extras = extraTicketTexts
    .map((t) => t.trim().slice(0, MAX_TICKET_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_EXTRA_TICKETS)
    .map((text, i) => ({ id: 1000 + i, text }));
  return [...TICKETS, ...extras];
}

export async function runSequential(apiKey: string, extraTicketTexts: string[] = []): Promise<RunResult> {
  const client = requireClient(apiKey);
  const tickets = buildTicketList(extraTicketTexts);
  const start = performance.now();
  const rows: Awaited<ReturnType<typeof judgeOne>>[] = [];
  for (const ticket of tickets) {
    rows.push(await judgeOne(client, ticket));
  }
  return summarize(rows, performance.now() - start);
}

export async function runParallel(apiKey: string, extraTicketTexts: string[] = []): Promise<RunResult> {
  const client = requireClient(apiKey);
  const tickets = buildTicketList(extraTicketTexts);
  const start = performance.now();
  const rows = await Promise.all(tickets.map((ticket) => judgeOne(client, ticket)));
  return summarize(rows, performance.now() - start);
}
