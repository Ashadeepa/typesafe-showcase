import Link from "next/link";
import BluffGame from "./BluffGame";

export const metadata = {
  title: "Bluff — TypeSafe use cases",
};

export default function BluffPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-ink-muted hover:text-ink-primary">
        ← All use cases
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-ink-primary">Bluff (Noul)</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        The classic Indian card game, also called Cheat: claim ranks in sequence, bluff when you
        don&rsquo;t have them, and call out anyone you don&rsquo;t believe. Each AI opponent asks
        Jev how plausible your claim is before deciding whether to call bluff — except when the
        math already makes the claim impossible, which it catches on its own.
      </p>
      <div className="mt-6">
        <BluffGame />
      </div>
    </main>
  );
}
