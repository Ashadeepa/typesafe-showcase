import Link from "next/link";
import ParallelDemo from "./ParallelDemo";

export const metadata = {
  title: "Parallel processing — TypeSafe use cases",
};

export default function ParallelPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-ink-muted hover:text-ink-primary">
        ← All use cases
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-ink-primary">Parallel processing (Noul)</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        Judges the same 16 support tickets — &ldquo;is this about billing?&rdquo; — sequentially,
        then again all at once. Same questions, same model, only concurrency changes.
      </p>
      <div className="mt-6">
        <ParallelDemo />
      </div>
    </main>
  );
}
