'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

interface TurnstileContextType {
  isTurnstileLoaded: boolean;
  turnstileToken: string | null;
  setTurnstileToken: (token: string | null) => void;
  executeTurnstile: () => Promise<string | null>;
  resetTurnstile: () => void;
}

const TurnstileContext = createContext<TurnstileContextType>({
  isTurnstileLoaded: false,
  turnstileToken: null,
  setTurnstileToken: () => {},
  executeTurnstile: async () => null,
  resetTurnstile: () => {}
});

export const useTurnstile = () => useContext(TurnstileContext);

export default function TurnstileProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);

  // デバッグ: サイトキーの確認
  useEffect(() => {
    console.log('TURNSTILE_SITE_KEY:', TURNSTILE_SITE_KEY);
    console.log('TURNSTILE_SITE_KEY type:', typeof TURNSTILE_SITE_KEY);
    console.log('TURNSTILE_SITE_KEY length:', TURNSTILE_SITE_KEY?.length);
  }, []);

  useEffect(() => {
    // Turnstileスクリプトの読み込み
    if (typeof window !== 'undefined' && !window.turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Turnstile script loaded successfully');
        setIsLoaded(true);
      };
      script.onerror = (error) => {
        console.error('Turnstile script loading error:', error);
        console.error('Error details:', {
          message: error instanceof ErrorEvent ? error.message : 'Unknown error',
          filename: error instanceof ErrorEvent ? error.filename : 'Unknown file',
          lineno: error instanceof ErrorEvent ? error.lineno : 'Unknown line',
          colno: error instanceof ErrorEvent ? error.colno : 'Unknown column'
        });
        console.error('Script src:', script.src);
        console.error('Script element:', script);
        
        // フォールバック：開発環境では警告のみ表示
        if (process.env.NODE_ENV === 'development') {
          console.warn('Development mode: Continuing without Turnstile');
        }
      };
      document.head.appendChild(script);
    } else if (window.turnstile) {
      setIsLoaded(true);
    }
  }, []);

  const executeTurnstile = async (): Promise<string | null> => {
    if (!isLoaded || !window.turnstile || !TURNSTILE_SITE_KEY) {
      console.error('Turnstile not loaded or site key missing');
      return null;
    }

    return new Promise((resolve) => {
      try {
        const id = window.turnstile.render('.cf-turnstile', {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => {
            console.log('Turnstile token received:', token);
            setTurnstileToken(token);
            resolve(token);
          },
          'error-callback': (error: any) => {
            console.error('Turnstile error:', error);
            resolve(null);
          },
          theme: 'light',
          size: 'normal'
        });
        setWidgetId(id);
      } catch (error) {
        console.error('Turnstile render error:', error);
        resolve(null);
      }
    });
  };

  const resetTurnstile = () => {
    if (isLoaded && window.turnstile && widgetId) {
      window.turnstile.reset(widgetId);
      setTurnstileToken(null);
    }
  };

  return (
    <TurnstileContext.Provider value={{
      isTurnstileLoaded: isLoaded,
      turnstileToken,
      setTurnstileToken,
      executeTurnstile,
      resetTurnstile
    }}>
      {children}
    </TurnstileContext.Provider>
  );
}

// グローバル型定義
declare global {
  interface Window {
    turnstile: {
      render: (element: string | Element, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback'?: (error: any) => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact';
      }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}