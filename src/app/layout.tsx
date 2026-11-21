import type { Metadata } from "next";
import { SpiderWebBackground } from "@/components/spider-web-background";
import { CursorInteractions } from "@/components/cursor-interactions";
import { ScrollEffects } from "@/components/scroll-effects";
import "./globals.css";

export const metadata: Metadata = {
  title: "Abhishek | Cybersecurity Portfolio",
  description:
    "Cybersecurity portfolio for a security operations and SOC analyst role.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SpiderWebBackground />
        <div className="site-content">
          <CursorInteractions />
          <ScrollEffects />
          {children}
        </div>
      </body>
    </html>
  );
}
