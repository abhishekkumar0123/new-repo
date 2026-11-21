import type { Metadata } from "next";
import { SpiderWebBackground } from "@/components/spider-web-background";
import { CursorInteractions } from "@/components/cursor-interactions";
import { ScrollEffects } from "@/components/scroll-effects";
import { KonamiEasterEgg } from "@/components/konami-easter-egg";
import "./globals.css";

export const metadata: Metadata = {
  title: "Abhishek | Cybersecurity Portfolio",
  description:
    "Cybersecurity portfolio for a security operations and SOC analyst role.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (typeof window !== "undefined") {
    console.log(
      "%c[SECRET]%c Konami code (↑↑↓↓←→←→BA) unlocks a hidden terminal. Try 'whoami --secret' in the interactive terminal.",
      "color:#00ff91;font-weight:bold",
      "color:#bdc8c2",
    );
  }

  return (
    <html lang="en">
      <body>
        <SpiderWebBackground />
        <div className="site-content">
          <CursorInteractions />
          <ScrollEffects />
          <KonamiEasterEgg />
          {children}
        </div>
      </body>
    </html>
  );
}
