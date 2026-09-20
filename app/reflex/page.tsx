import Link from "next/link";
import ReflexGame from "./ReflexGame";

export const metadata = {
  title: "Reaction Match — TypeSafe use cases",
};

export default function ReflexPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-ink-muted hover:text-ink-primary">
        ← All use cases
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-ink-primary">Reaction Match (Noul)</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        A ticket appears. Guess "Billing" or "Not billing" before Jev's own answer comes back —
        you're racing its real, measured response time, not a countdown clock. Best of 10 rounds.
      </p>
      <div className="mt-6">
        <ReflexGame />
      </div>
    </main>
  );
}
