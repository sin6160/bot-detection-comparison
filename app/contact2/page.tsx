import ContactForm2 from '@/app/components/ContactForm2';

export const metadata = {
  title: 'お問い合わせ (Turnstile) - Bot検知サービス比較',
  description: 'お問い合わせフォーム - Cloudflare Turnstileを使用したBot検知',
};

export default function Contact2Page() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">お問い合わせ (Turnstile版)</h1>
      <div className="mb-6 max-w-md mx-auto bg-blue-50 border border-blue-200 p-4 rounded-md text-sm">
        <h2 className="font-bold text-blue-800 mb-2">Cloudflare Turnstileについて</h2>
        <p className="mb-2">
          このページではCloudflare Turnstileを使用してBot検知を行います。
        </p>
        <p>
          送信ボタンの上に表示されるチェックボックスをクリックして認証を完了してください。
        </p>
      </div>
      <ContactForm2 />
    </div>
  );
}