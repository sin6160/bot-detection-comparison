import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RecaptchaProvider from "./components/RecaptchaProvider";
import TurnstileProvider from "./components/TurnstileProvider";
import BotScoreDisplay from "./components/BotScoreDisplay";
import MouseCursorEffect from "./components/MouseCursorEffect";

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
      <head>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >

        <RecaptchaProvider>
          <TurnstileProvider>
            {children}
            <BotScoreDisplay />
            <MouseCursorEffect />
          </TurnstileProvider>
        </RecaptchaProvider>
        
      </body>
    </html>
  );
}
