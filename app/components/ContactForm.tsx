'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRecaptcha } from './RecaptchaProvider';
import { useCloudflareBot } from './CloudflareBotProvider';

export default function ContactForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | '';
    message: string;
  }>({ type: '', message: '' });
  
  // reCAPTCHAとCloudflare Bot Detection Hooks
  const { executeRecaptcha, isRecaptchaLoaded } = useRecaptcha();
  const { getBotStatus, jsDetectionPassed } = useCloudflareBot();

  // フォーム送信前にCloudflareのBot Statusを更新する
  useEffect(() => {
    // 初回ロード時にステータスを更新
    const updateBotStatus = async () => {
      try {
        const status = await getBotStatus();
        console.log('Cloudflare Bot Status (初期化時):', status);
      } catch (error) {
        console.error('Cloudflare Bot Status初期化エラー:', error);
      }
    };
    
    updateBotStatus();
  }, [getBotStatus]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // 1. 送信前に最新のCloudflare Bot Statusを取得
      let cfBotStatus = null;
      try {
        cfBotStatus = await getBotStatus();
        console.log('送信前のCloudflare Bot Status:', cfBotStatus);
      } catch (error) {
        console.error('Cloudflare Bot Status取得エラー:', error);
      }
      
      // 2. reCAPTCHAのトークンを取得
      let recaptchaToken = '';
      if (isRecaptchaLoaded) {
        recaptchaToken = await executeRecaptcha();
      }

      // 3. データ送信とレスポンス処理
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // JavaScript検出の結果をヘッダーに含める
          'X-CF-JS-Detection-Status': jsDetectionPassed !== null 
            ? (jsDetectionPassed ? 'passed' : 'failed')
            : 'unknown'
        },
        body: JSON.stringify({
          email,
          message,
          recaptchaToken,
          // Bot検出情報も含める
          botDetection: {
            cloudflareJsDetectionPassed: jsDetectionPassed,
            timestamp: new Date().toISOString()
          }
        }),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (error) {
        console.error('レスポンスのJSON解析に失敗しました:', error);
        data = { error: 'サーバーからのレスポンスの解析に失敗しました' };
      }
      
      // 4. 送信後に再度Botステータスを確認
      try {
        const afterSubmitStatus = await getBotStatus();
        console.log('送信後のCloudflare Bot Status:', afterSubmitStatus);
      } catch (error) {
        console.error('送信後のBot Status取得エラー:', error);
      }
      
      if (response.ok) {
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
      
      {/* デバッグ用のJS検出状態表示 */}
      <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
        <p className="font-medium">Bot検知状態:</p>
        <div className="mt-1 space-y-1">
          <p>• JS検出: 
            <span className={jsDetectionPassed === null ? 'text-gray-600' : 
                            (jsDetectionPassed ? 'text-green-600' : 'text-red-600')}>
              {jsDetectionPassed === null ? '未検証' : 
               (jsDetectionPassed ? '通過' : '検証失敗')}
            </span>
          </p>
        </div>
      </div>
      
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

      {/* Cloudflare JavaScript検出の結果をテストするためのボタン */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium mb-2">検出テスト</h3>
        <button
          onClick={async () => {
            try {
              const status = await getBotStatus();
              console.log('Cloudflare Bot Status (再取得):', status);
            } catch (error) {
              console.error('Bot Status取得エラー:', error);
            }
          }}
          className="w-full p-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
        >
          Bot検出ステータスを更新
        </button>
      </div>
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