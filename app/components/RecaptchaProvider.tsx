'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// reCAPTCHA Enterprise サイトキー
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

interface RecaptchaContextType {
  executeRecaptcha: () => Promise<string>;
  isRecaptchaLoaded: boolean;
  botScore: number | null;
}

const RecaptchaContext = createContext<RecaptchaContextType>({
  executeRecaptcha: async () => '',
  isRecaptchaLoaded: false,
  botScore: null
});

export const useRecaptcha = () => useContext(RecaptchaContext);

export default function RecaptchaProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [recaptchaInstance, setRecaptchaInstance] = useState<typeof window.grecaptcha.enterprise | null>(null);
  const [botScore, setBotScore] = useState<number | null>(null);

  useEffect(() => {
    // reCAPTCHAスクリプトの読み込み
    if (typeof window !== 'undefined') {
      const existingScript = document.getElementById('recaptcha-script');
      
      if (!existingScript) {
        try {
          const script = document.createElement('script');
          script.id = 'recaptcha-script';
          script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`;
          script.async = true;
          script.defer = true;
          
          script.onload = () => {
            if (window.grecaptcha && window.grecaptcha.enterprise) {
              window.grecaptcha.enterprise.ready(() => {
                setRecaptchaInstance(window.grecaptcha.enterprise);
                setIsLoaded(true);
              });
            }
          };
          
          script.onerror = () => {
            console.error('reCAPTCHAスクリプトの読み込みに失敗しました');
          };
          
          document.head.appendChild(script);
        } catch (error) {
          console.error('reCAPTCHAスクリプトの初期化に失敗しました:', error);
        }
      } else if (window.grecaptcha && window.grecaptcha.enterprise) {
        setRecaptchaInstance(window.grecaptcha.enterprise);
        setIsLoaded(true);
      }
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        const recaptchaScript = document.getElementById('recaptcha-script');
        if (recaptchaScript && recaptchaScript.parentNode) {
          recaptchaScript.parentNode.removeChild(recaptchaScript);
        }
      }
    };
  }, []);

  // reCAPTCHA実行関数
  const executeRecaptcha = async (): Promise<string> => {
    if (!isLoaded || !recaptchaInstance) {
      console.warn('reCAPTCHA Enterprise が準備できていません');
      return '';
    }

    try {
      if (window.grecaptcha && window.grecaptcha.enterprise) {
        // サイトキーがない場合は実行できない
        if (!RECAPTCHA_SITE_KEY) {
          console.error('reCAPTCHA サイトキーが設定されていません');
          return '';
        }
        const token = await recaptchaInstance.execute(RECAPTCHA_SITE_KEY, { action: 'submit' });
        
        // スコアを取得するためにバックエンドAPIを呼び出す
        try {
          const response = await fetch('/api/recaptcha', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, action: 'submit' }),
          });
          
          const result = await response.json();
          if (result.success && typeof result.score === 'number') {
            setBotScore(result.score);
          }
        } catch (verifyError) {
          console.error('reCAPTCHAスコア検証エラー:', verifyError);
        }
        
        return token;
      } else {
        console.error('grecaptcha.enterprise.executeが利用できません');
        return '';
      }
    } catch (error) {
      console.error('reCAPTCHA Enterprise execution failed:', error);
      return '';
    }
  };

  return (
    <RecaptchaContext.Provider value={{
      executeRecaptcha,
      isRecaptchaLoaded: isLoaded,
      botScore
    }}>
      {children}
    </RecaptchaContext.Provider>
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