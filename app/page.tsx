import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="text-3xl font-bold">Bot検知サービス比較サイト</h1>
        
        <div className="my-8">
          <h2 className="text-xl font-semibold mb-4">サービス紹介</h2>
          <p className="mb-4">
            このサイトでは、reCAPTCHA EnterpriseとCloudflare Bot Fight Modeの
            bot検知機能を比較検証しています。
          </p>
          <p className="mb-4">
            問い合わせフォームを使って両サービスの検知精度や使い勝手を
            体験いただけます。
          </p>
        </div>
        
        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="/contact"
          >
            お問い合わせフォームへ
          </Link>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <p className="text-sm">© 2025 Bot検知サービス比較サイト</p>
      </footer>
    </div>
  );
}
