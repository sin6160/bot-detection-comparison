import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RecaptchaProvider from "./components/RecaptchaProvider";
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
      <head>
        {/* Content-Security-Policy ヘッダーを設定してreCAPTCHAを許可する */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.google.com; frame-src https://www.google.com https://www.gstatic.com;"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >

        <RecaptchaProvider>
          {children}
          <BotScoreDisplay />
        </RecaptchaProvider>
        
      </body>
    </html>
  );
}
