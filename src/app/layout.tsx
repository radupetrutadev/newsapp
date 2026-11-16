import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { site } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    siteName: site.name,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0908",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} antialiased`}
    >
      <body className="min-h-dvh bg-background font-sans text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
