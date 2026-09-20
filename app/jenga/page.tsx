import Link from "next/link";
import JengaGame from "./JengaGame";

export const metadata = {
  title: "Sentence Jenga — TypeSafe use cases",
};

export default function JengaPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-ink-muted hover:text-ink-primary">
        ← All use cases
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-ink-primary">Sentence Jenga (Noul)</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        Pull one word at a time. After each pull, Jev judges whether the sentence still means what it
        started out meaning — and the probability it returns is the tower&rsquo;s structural
        integrity. Strip it as far as you dare before the meaning collapses.
      </p>
      <div className="mt-6">
        <JengaGame />
      </div>
    </main>
  );
}
