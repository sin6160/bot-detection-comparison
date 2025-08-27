'use client';

import { useState, FormEvent } from 'react';
import { useTurnstile } from './TurnstileProvider';
import TurnstileWidget from './TurnstileWidget';

export default function ContactForm2() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | '';
    message: string;
  }>({ type: '', message: '' });
  
  const { turnstileToken, resetTurnstile } = useTurnstile();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    // Turnstileトークンの確認
    if (!turnstileToken) {
      setStatus({
        type: 'error',
        message: 'Bot検証が完了していません。チェックボックスをクリックしてください。',
      });
      setLoading(false);
      return;
    }

    try {
      // データ送信とレスポンス処理
      const response = await fetch('/api/contact2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          message,
          turnstileToken,
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
        console.log('ContactForm2 レスポンスデータ:', data);
        
        setStatus({
          type: 'success',
          message: 'お問い合わせありがとうございます。確認次第ご連絡いたします。',
        });
        setEmail('');
        setMessage('');
        
        // Turnstileをリセット
        resetTurnstile();
      } else {
        setStatus({
          type: 'error',
          message: data.error || 'エラーが発生しました。もう一度お試しください。',
        });
        
        // エラー時もTurnstileをリセット
        resetTurnstile();
      }
    } catch (error) {
      console.error('Contact form submission error:', error);
      setStatus({
        type: 'error',
        message: 'エラーが発生しました。もう一度お試しください。',
      });
      
      // エラー時もTurnstileをリセット
      resetTurnstile();
    } finally {
      setLoading(false);
    }
  };

  const handleTurnstileSuccess = (token: string) => {
    console.log('Turnstile成功:', token);
  };

  const handleTurnstileError = (error: any) => {
    console.error('Turnstileエラー:', error);
    setStatus({
      type: 'error',
      message: 'Bot検証でエラーが発生しました。ページを再読み込みしてください。',
    });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">お問い合わせ (Turnstile版)</h2>
      
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

        {/* Turnstileウィジェット */}
        <div className="my-4">
          <TurnstileWidget 
            onSuccess={handleTurnstileSuccess}
            onError={handleTurnstileError}
            theme="light"
            size="normal"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !turnstileToken}
          className="w-full p-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Turnstileの状態表示（デバッグ用） */}
      <div className="mt-6 p-3 bg-gray-100 rounded text-sm">
        <p className="font-medium">Turnstile状態:</p>
        <p className="mt-1">
          トークン: 
          <span className={turnstileToken ? 'text-green-600' : 'text-red-600'}>
            {turnstileToken ? '取得済み' : '未取得'}
          </span>
        </p>
      </div>
    </div>
  );
}