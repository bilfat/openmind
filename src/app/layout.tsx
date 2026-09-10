import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { GlobalLoader } from "@/components/ui/global-loader";
import { fetchActiveEventServer } from "@/lib/event-server";
import { eventDisplayName } from "@/lib/event-utils";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontDisplay = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { event } = await fetchActiveEventServer();
  const name = eventDisplayName(event);
  const tagline = event?.tagline || event?.theme || "One Action Endless Impact";
  return {
    title: `${name} — ${tagline}`,
    description: event?.description || `Event seminar dan networking eksklusif oleh HIPMI PT Telkom University. ${tagline}.`,
  };
}

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
