import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RecaptchaProvider from "./components/RecaptchaProvider";
import CloudflareBotProvider from "./components/CloudflareBotProvider";
import BotScoreDisplay from "./components/BotScoreDisplay";
import Script from "next/script";

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
        {/* Content-Security-Policy ヘッダーを設定して、Cloudflareのスクリプトを許可する */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.cloudflare.com https://www.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.cloudflare.com https://*.google.com;"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Cloudflare Challenge Platform スクリプト */}
        <Script
          id="cloudflare-challenge-script"
          src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"
          strategy="afterInteractive"
          onLoad={() => console.log('Cloudflare Challenge Platform スクリプトがロードされました')}
          onError={(e) => console.error('Cloudflare スクリプトのロードに失敗しました', e)}
        />

        <RecaptchaProvider>
          <CloudflareBotProvider>
            {children}
            <BotScoreDisplay />
          </CloudflareBotProvider>
        </RecaptchaProvider>
        
        {/* ローカル開発環境で Cloudflare Challenge Platform をエミュレートするための初期化コード */}
        <Script id="cloudflare-init" strategy="afterInteractive">
          {`
            // ローカル開発環境でのCloudflareBotJavaScriptDetectionsをエミュレート
            if (typeof window !== 'undefined' && !window._cf_chl_opt) {
              console.log('ローカル開発用のCloudflareBotエミュレーション初期化');
              window._cf_chl_opt = {
                cvId: 'test-cv-id',
                cType: 'non-interactive',
                cNounce: '12345',
                cRay: 'test-ray-id',
                cHash: 'test-hash',
                cUPMDTk: '',
                cFPWv: '0',
                cTTimeMs: '1000',
                cMTimeMs: '1000',
                cRq: {
                  ru: 'test',
                  ra: 'test',
                  rm: 'test',
                  d: 'test',
                }
              };
              // クッキーをシミュレート
              if (!document.cookie.includes('cf_clearance=')) {
                const expires = new Date(Date.now() + 86400000).toUTCString();
                document.cookie = 'cf_clearance=test-clearance-cookie; expires=' + expires + '; path=/;';
              }
            }
          `}
        </Script>
      </body>
    </html>
  );
}
