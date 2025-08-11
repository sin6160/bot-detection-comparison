'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface CloudflareBotContextType {
  botScore: number | null;
  getBotStatus: () => Promise<{
    botScore: number | null;
    botTags: string[];
    isCloudflareBotManagementEnabled: boolean;
  }>;
}

const CloudflareBotContext = createContext<CloudflareBotContextType>({
  botScore: null,
  getBotStatus: async () => ({ 
    botScore: null, 
    botTags: [], 
    isCloudflareBotManagementEnabled: false 
  }),
});

export const useCloudflareBot = () => useContext(CloudflareBotContext);

export default function CloudflareBotProvider({ children }: { children: React.ReactNode }) {
  const [botScore, setBotScore] = useState<number | null>(null);
  const [botTags, setBotTags] = useState<string[]>([]);
  const [isBotManagementEnabled, setIsBotManagementEnabled] = useState(false);

  // Cloudflare Bot Management情報を取得
  const getBotStatus = async () => {
    try {
      const response = await fetch('/api/cloudflare');
      const data = await response.json();
      
      setBotScore(data.botScore);
      setBotTags(data.botTags || []);
      setIsBotManagementEnabled(data.cloudflare?.hasBotHeaders || false);
      
      return {
        botScore: data.botScore,
        botTags: data.botTags || [],
        isCloudflareBotManagementEnabled: data.isCloudflareBotManagementEnabled
      };
    } catch (error) {
      console.error('Cloudflare Bot Status 取得エラー:', error);
      return {
        botScore: null,
        botTags: [],
        isCloudflareBotManagementEnabled: false
      };
    }
  };

  // 初回ロード時にステータスを取得
  useEffect(() => {
    // APIからステータスを取得
    getBotStatus();
  }, []);

  return (
    <CloudflareBotContext.Provider value={{
      botScore,
      getBotStatus
    }}>
      {children}
    </CloudflareBotContext.Provider>
  );
}