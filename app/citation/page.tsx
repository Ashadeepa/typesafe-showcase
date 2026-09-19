import Link from "next/link";
import CitationDemo from "./CitationDemo";

export const metadata = {
  title: "Citation check — TypeSafe use cases",
};

export default function CitationPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-ink-muted hover:text-ink-primary">
        ← All use cases
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-ink-primary">Citation / claim check (Choice)</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        A hallucination detector: checks whether each claim is actually supported by the policy
        document it cites — <em>supports</em>, <em>contradicts</em>, or <em>says nothing</em> — instead
        of a plain yes/no.
      </p>
      <div className="mt-6">
        <CitationDemo />
      </div>
    </main>
  );
}
