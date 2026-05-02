import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://kaptrix.com";

export const metadata: Metadata = {
  title: {
    default: "Kaptrix | A fast, structured read on a company",
    template: "%s | Kaptrix",
  },
  description:
    "Kaptrix turns messy company data into a clear view of risks, gaps, and opportunities — in hours, not weeks.",
  metadataBase: new URL(baseUrl),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/kaptrix-logo.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/kaptrix-logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Kaptrix",
    title: "Kaptrix | A fast, structured read on a company",
    description:
      "Kaptrix turns messy company data into a clear view of risks, gaps, and opportunities — in hours, not weeks.",
    url: baseUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Kaptrix | A fast, structured read on a company",
    description:
      "Kaptrix turns messy company data into a clear view of risks, gaps, and opportunities — in hours, not weeks.",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "wrahXh8ko1GDtQdrcbZEJRkAV7KXwsxMKEkmj5OminI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
