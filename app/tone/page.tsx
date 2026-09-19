import Link from "next/link";
import ToneDemo from "./ToneDemo";

export const metadata = {
  title: "Passive-aggressiveness meter — TypeSafe use cases",
};

export default function TonePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-ink-muted hover:text-ink-primary">
        ← All use cases
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-ink-primary">
        The passive-aggressiveness meter (Score)
      </h1>
      <p className="mt-2 text-sm text-ink-secondary">
        10 real-life-flavored notes and messages, scored on an escalation rubric from a plain,
        sincere statement to full passive-aggressive weaponry — sorted worst-to-best once you run it.
      </p>
      <div className="mt-6">
        <ToneDemo />
      </div>
    </main>
  );
}
