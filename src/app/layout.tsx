import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { GlobalLoader } from "@/components/ui/global-loader";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontDisplay = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OPEN MIND 2026 — One Action Endless Impact",
  description: "Event seminar dan networking eksklusif oleh HIPMI PT Telkom University. Expand Your Perspective, Build Your Future.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontDisplay.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <GlobalLoader />
        {children}
      </body>
    </html>
  );
}
