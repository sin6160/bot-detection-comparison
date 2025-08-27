'use client';

import { useState, FormEvent } from 'react';
import { useRecaptcha } from './RecaptchaProvider';

export default function ContactForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | '';
    message: string;
  }>({ type: '', message: '' });
  
  // reCAPTCHA Hook
  const { executeRecaptcha, isRecaptchaLoaded, setBotScore } = useRecaptcha();


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // reCAPTCHAのトークンを取得
      let recaptchaToken = '';
      if (isRecaptchaLoaded) {
        recaptchaToken = await executeRecaptcha();
      }

      // データ送信とレスポンス処理
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          message,
          recaptchaToken,
        }),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (error) {
        console.error('レスポンスのJSON解析に失敗しました:', error);
        data = { error: 'サーバーからのレスポンスの解析に失敗しました' };
      }
      
      
      if (response.ok) {
        // レスポンスからreCAPTCHAスコアを取得してBotScoreDisplayに反映
        console.log('ContactForm レスポンスデータ:', data);
        if (data.scores?.recaptcha !== undefined && data.scores.recaptcha !== null) {
          console.log('ContactFormでスコア設定:', data.scores.recaptcha);
          setBotScore(data.scores.recaptcha);
        } else {
          console.warn('ContactFormでスコアが見つかりません。現在のスコアを保持します:', data);
          // スコアがnullやundefinedの場合は既存のスコアを保持（setBotScoreを呼ばない）
        }
        
        setStatus({
          type: 'success',
          message: 'お問い合わせありがとうございます。確認次第ご連絡いたします。',
        });
        setEmail('');
        setMessage('');
      } else {
        setStatus({
          type: 'error',
          message: data.error || 'エラーが発生しました。もう一度お試しください。',
        });
      }
    } catch (error) {
      console.error('Contact form submission error:', error);
      setStatus({
        type: 'error',
        message: 'エラーが発生しました。もう一度お試しください。',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">お問い合わせ</h2>
      
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="block mb-2 text-sm font-medium">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="message" className="block mb-2 text-sm font-medium">
            お問い合わせ内容
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded h-32"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? '送信中...' : '送信'}
        </button>

        {status.message && (
          <div
            className={`mt-4 p-3 rounded ${
              status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {status.message}
          </div>
        )}
      </form>

    </div>
  );
}

// グローバルで使用できるよう型定義を拡張
declare global {
  interface Window {
    grecaptcha: {
      enterprise: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}