import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RecaptchaProvider from "./components/RecaptchaProvider";
import CloudflareBotProvider from "./components/CloudflareBotProvider";
import BotScoreDisplay from "./components/BotScoreDisplay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bot検知サービス比較サイト",
  description: "reCAPTCHA EnterpriseとCloudflare Bot Fight Modeの比較検証サイト",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RecaptchaProvider>
          <CloudflareBotProvider>
            {children}
            <BotScoreDisplay />
          </CloudflareBotProvider>
        </RecaptchaProvider>
      </body>
    </html>
  );
}
