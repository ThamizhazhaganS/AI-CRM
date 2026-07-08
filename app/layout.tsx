import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EstateAI Receptionist — Never Miss a Lead Again",
  description: "Virtual AI receptionist CRM dashboard for real estate companies. Answering calls 24/7, qualifying leads, and auto-updating CRMs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-navy-950 text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
