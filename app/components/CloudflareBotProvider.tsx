'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface CloudflareBotContextType {
  botScore: number | null;
  jsDetectionPassed: boolean | null;
  getBotStatus: () => Promise<{
    botScore: number | null;
    botTags: string[];
    isCloudflareBotManagementEnabled: boolean;
    jsDetectionPassed: boolean | null;
  }>;
}

const CloudflareBotContext = createContext<CloudflareBotContextType>({
  botScore: null,
  jsDetectionPassed: null,
  getBotStatus: async () => ({ 
    botScore: null, 
    botTags: [], 
    isCloudflareBotManagementEnabled: false,
    jsDetectionPassed: null
  }),
});

export const useCloudflareBot = () => useContext(CloudflareBotContext);

export default function CloudflareBotProvider({ children }: { children: React.ReactNode }) {
  const [botScore, setBotScore] = useState<number | null>(null);
  // JavaScript detectionsの状態を追跡
  const [jsDetectionPassed, setJsDetectionPassed] = useState<boolean | null>(null);
  // 内部状態を管理するためのステート変数
  const [, setBotTags] = useState<string[]>([]);
  const [, setIsBotManagementEnabled] = useState(false);

  // Challenge Platformスクリプトを読み込む関数
  const loadChallengePlatformScript = () => {
    // すでに読み込まれていたら何もしない
    if (document.getElementById('cloudflare-challenge-script')) {
      return;
    }

    console.log('Cloudflare Challenge Platformスクリプトを読み込みます');
    
    // スクリプトを作成
    const script = document.createElement('script');
    script.id = 'cloudflare-challenge-script';
    script.src = '/cdn-cgi/challenge-platform/scripts/jsd/main.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Cloudflare Challenge Platformスクリプトの読み込みが完了しました');
    };
    script.onerror = (error) => {
      console.error('Cloudflare Challenge Platformスクリプト読み込みエラー:', error);
      // エラー時はローカルでのテスト用に疑似的なスクリプトを作成
      createLocalTestingScript();
    };

    // ドキュメントに追加
    document.head.appendChild(script);
  };

  // ローカル開発環境用の疑似スクリプト（テスト用）
  const createLocalTestingScript = () => {
    // グローバルオブジェクトにCloudflareの擬似オブジェクトを作成
    // 注意: 本番環境では不要
    console.log('ローカルテスト用の疑似Cloudflareオブジェクトを作成します');
    window._cf_chl_opt = {
      cvId: 'local-testing',
      cType: 'non-interactive',
      cNounce: '12345',
      cRay: 'local-test-ray',
      cHash: 'abcdef',
      cUPMDTk: '',
      cFPWv: '0',
      cTTimeMs: '1000',
      cMTimeMs: '1000',
      cRq: {
        ru: 'test',
        ra: 'test',
        rm: 'test',
        d: 'test',
      }
    };
  };

  // Cloudflare Bot Management情報を取得
  const getBotStatus = async () => {
    try {
      // Challenge Platformスクリプトが実行されているか確認するためのcf_clearanceクッキーを確認
      const hasClearanceCookie = document.cookie.includes('cf_clearance=');
      
      const response = await fetch('/api/cloudflare', {
        // カスタムヘッダーを追加して、JSデテクションの結果を含める
        headers: {
          'X-CF-JS-Detection-Result': hasClearanceCookie ? 'passed' : 'failed'
        }
      });
      const data = await response.json();
      
      setBotScore(data.botScore);
      setBotTags(data.botTags || []);
      setIsBotManagementEnabled(data.cloudflare?.hasBotHeaders || false);
      setJsDetectionPassed(data.jsDetectionPassed);
      
      return {
        botScore: data.botScore,
        botTags: data.botTags || [],
        isCloudflareBotManagementEnabled: data.isCloudflareBotManagementEnabled,
        jsDetectionPassed: data.jsDetectionPassed
      };
    } catch (error) {
      console.error('Cloudflare Bot Status 取得エラー:', error);
      return {
        botScore: null,
        botTags: [],
        isCloudflareBotManagementEnabled: false,
        jsDetectionPassed: null
      };
    }
  };

  // 初回ロード時にステータスを取得
  useEffect(() => {
    // Challenge Platformスクリプトの読み込み
    if (typeof window !== 'undefined') {
      loadChallengePlatformScript();
    }

    // APIからステータスを取得
    const fetchData = async () => {
      try {
        console.log('初回ロード時にCloudflare Bot Statusを取得します');
        const result = await getBotStatus();
        console.log('初回ロード時のBot Status結果:', result);
      } catch (error) {
        console.error('初回ロード時のBot Status取得エラー:', error);
      }
    };
    
    fetchData();

    // クリーンアップ関数
    return () => {
      // Cloudflareスクリプトを削除
      if (typeof window !== 'undefined') {
        const script = document.getElementById('cloudflare-challenge-script');
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      }
    };
  }, []);

  return (
    <CloudflareBotContext.Provider value={{
      botScore,
      jsDetectionPassed,
      getBotStatus
    }}>
      {children}
    </CloudflareBotContext.Provider>
  );
}

// グローバルで使用できるよう型定義を拡張
declare global {
  interface Window {
    _cf_chl_opt?: {
      cvId: string;
      cType: string;
      cNounce: string;
      cRay: string;
      cHash: string;
      cUPMDTk: string;
      cFPWv: string;
      cTTimeMs: string;
      cMTimeMs: string;
      cRq: {
        ru: string;
        ra: string;
        rm: string;
        d: string;
      };
    };
  }
}