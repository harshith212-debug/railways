import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Rail Yatra — Indian Railways Super-App",
  description:
    "Rail Yatra unified Indian Railways platform: IRCTC Reserved Ticketing, UTS Paperless QR Passes, Live NTES Train Tracking, PNR Status, Coach Maps, R-Wallet, E-Catering & Rail Madad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased min-h-screen bg-[#F1F5F9] text-slate-900">
        {children}
      </body>
    </html>
  );
}
