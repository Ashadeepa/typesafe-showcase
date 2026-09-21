import Link from "next/link";
import { Cinzel, Spectral, IBM_Plex_Mono } from "next/font/google";
import BluffGame from "./BluffGame";
import styles from "./bluff.module.css";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-body",
});
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-numeric" });

export const metadata = {
  title: "Bluff — TypeSafe use cases",
};

export default function BluffPage() {
  return (
    <main className={`${cinzel.variable} ${spectral.variable} ${plexMono.variable} ${styles.page}`}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← All use cases
        </Link>
        <h1 className={styles.pageTitle}>Bluff (Noul)</h1>
        <p className={styles.pageIntro}>
          The classic Indian card game, also called Cheat: claim ranks in sequence, bluff when you
          don&rsquo;t have them, and call out anyone you don&rsquo;t believe. Each AI opponent asks
          Jev how plausible your claim is — both which cards to play and whether to call your
          bluff — except when the math already makes a claim impossible, which it catches on its
          own.
        </p>
        <div className={styles.gameSlot}>
          <BluffGame />
        </div>
      </div>
    </main>
  );
}
