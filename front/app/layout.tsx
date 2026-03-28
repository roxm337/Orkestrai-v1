import type { Metadata } from "next";

import { AppFrame } from "@/components/app-frame";

import "./globals.css";

export const metadata: Metadata = {
  title: "Lead OS",
  description: "AI-native workflow automation for lead generation, local agents, and live execution visibility."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
