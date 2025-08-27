import ContactForm from '@/app/components/ContactForm';

export const metadata = {
  title: 'お問い合わせ - Bot検知サービス比較',
  description: 'お問い合わせフォーム - reCAPTCHA EnterpriseとCloudflare Bot Fight Modeの比較',
};

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">お問い合わせ</h1>
      <div className="mb-6 max-w-md mx-auto bg-blue-50 border border-blue-200 p-4 rounded-md text-sm">
        <h2 className="font-bold text-blue-800 mb-2">Bot検知について</h2>
        <p>
          フォーム送信時にreCAPTCHA Enterpriseによるbot検知を行い、スコアを画面左下に表示します。
        </p>
      </div>
      <ContactForm />
    </div>
  );
}