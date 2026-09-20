import Link from "next/link";
import TriageGame from "./TriageGame";

export const metadata = {
  title: "Triage Tetris — TypeSafe use cases",
};

export default function TriagePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-ink-muted hover:text-ink-primary">
        ← All use cases
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-ink-primary">Triage Tetris (Choice)</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        A support ticket falls. Steer it into the right lane — Billing, Bug, Feature, or Praise —
        before it lands. Jev judges the real category the instant it lands, live, and scores your
        catch. Speed ramps up the longer you survive.
      </p>
      <div className="mt-6">
        <TriageGame />
      </div>
    </main>
  );
}
