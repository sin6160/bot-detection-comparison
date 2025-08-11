import ContactForm from '@/app/components/ContactForm';

export const metadata = {
  title: 'お問い合わせ - Bot検知サービス比較',
  description: 'お問い合わせフォーム - reCAPTCHA EnterpriseとCloudflare Bot Fight Modeの比較',
};

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">お問い合わせ</h1>
      <ContactForm />
    </div>
  );
}