'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTurnstile } from './TurnstileProvider';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

interface TurnstileWidgetProps {
  onSuccess?: (token: string) => void;
  onError?: (error: unknown) => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
}

export default function TurnstileWidget({ 
  onSuccess, 
  onError, 
  theme = 'light', 
  size = 'normal' 
}: TurnstileWidgetProps) {
  const { isTurnstileLoaded, setTurnstileToken } = useTurnstile();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // コールバック関数をメモ化
  const handleSuccess = useCallback((token: string) => {
    console.log('Turnstile widget success:', token);
    setTurnstileToken(token);
    if (onSuccess) {
      onSuccess(token);
    }
  }, [onSuccess, setTurnstileToken]);

  const handleError = useCallback((error: unknown) => {
    console.error('Turnstile widget error:', error);
    if (onError) {
      onError(error);
    }
  }, [onError]);

  useEffect(() => {
    if (!isTurnstileLoaded || !window.turnstile || !TURNSTILE_SITE_KEY || !containerRef.current) {
      return;
    }

    // 既存のウィジェットがある場合は削除
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      } catch (error) {
        console.warn('Failed to remove existing Turnstile widget:', error);
      }
    }

    try {
      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: handleSuccess,
        'error-callback': handleError,
        theme,
        size
      });
      
      widgetIdRef.current = widgetId;
      console.log('Turnstile widget rendered with ID:', widgetId);
    } catch (error) {
      console.error('Turnstile widget render error:', error);
      handleError(error);
    }

    // クリーンアップ関数
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch (error) {
          console.warn('Failed to cleanup Turnstile widget:', error);
        }
      }
    };
  }, [isTurnstileLoaded, handleSuccess, handleError, theme, size]);

  if (!isTurnstileLoaded) {
    return (
      <div className="cf-turnstile-placeholder">
        <div className="animate-pulse bg-gray-200 h-16 w-64 rounded">
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Turnstile読み込み中...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="turnstile-container">
      <div ref={containerRef} className="cf-turnstile"></div>
    </div>
  );
}