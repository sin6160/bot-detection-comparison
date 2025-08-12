'use client';

import { useState, useEffect } from 'react';
import { useRecaptcha } from './RecaptchaProvider';
import { useCloudflareBot } from './CloudflareBotProvider';

export default function BotScoreDisplay() {
  const { botScore: recaptchaScore } = useRecaptcha();
  const { botScore: cloudflareScore, jsDetectionPassed, getBotStatus } = useCloudflareBot();
  const [visible, setVisible] = useState(true);

  // スコアの色を判定
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400';
    if (score > 0.7) return 'text-green-400';
    if (score > 0.3) return 'text-yellow-400';
    return 'text-red-400';
  };

  // JS検証結果のテキスト・色を判定
  const getJsDetectionStatus = () => {
    if (jsDetectionPassed === null) {
      return { text: '未検証', className: 'text-gray-400' };
    }
    return jsDetectionPassed 
      ? { text: '通過', className: 'text-green-400' }
      : { text: '失敗', className: 'text-red-400' };
  };

  // デバッグ用 - スコアが変更されたら記録
  useEffect(() => {
    console.log('reCAPTCHA Score:', recaptchaScore);
    console.log('Cloudflare Score:', cloudflareScore);
    console.log('JS Detection Passed:', jsDetectionPassed);
  }, [recaptchaScore, cloudflareScore, jsDetectionPassed]);

  const jsDetectionStatus = getJsDetectionStatus();

  return visible ? (
    <div className="fixed bottom-4 left-4 p-4 bg-black/90 text-white rounded-lg z-50 text-sm min-w-[240px] shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-base">Bot検知スコア</h3>
        <button 
          onClick={() => setVisible(false)}
          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
        >
          閉じる
        </button>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-medium">reCAPTCHA:</span>
          <span className={getScoreColor(recaptchaScore)}>
            {recaptchaScore !== null ? recaptchaScore.toFixed(3) : '-'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="font-medium">Cloudflare:</span>
          <span className={getScoreColor(cloudflareScore)}>
            {cloudflareScore !== null ? cloudflareScore.toFixed(3) : '-'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-medium">JS検証:</span>
          <span className={jsDetectionStatus.className}>
            {jsDetectionStatus.text}
          </span>
        </div>
      </div>
      
      <div className="text-xs mt-3 text-gray-300 border-t border-gray-700 pt-2">
        スコアが高いほど人間である確率が高いです
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-700">
        <button 
          onClick={async () => {
            try {
              const status = await getBotStatus();
              console.log('最新のBot Status取得結果:', status);
            } catch (error) {
              console.error('Bot Status取得エラー:', error);
            }
          }}
          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded w-full"
        >
          ステータス更新（デバッグ）
        </button>
      </div>
    </div>
  ) : null;
}