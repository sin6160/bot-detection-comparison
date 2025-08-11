import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Cloudflareからの情報を取得
    const userAgent = request.headers.get('user-agent') || '';
    const cfRay = request.headers.get('cf-ray');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    // Bot Score (Cloudflare Workersが必要)
    const cfBotScore = request.headers.get('cf-bot-score');
    const cfBotTags = request.headers.get('cf-bot-management');
    
    // User-Agentベースの簡易ボット検知
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python-requests/i
    ];
    
    const isBot = botPatterns.some(pattern => pattern.test(userAgent));
    
    // 正規化したスコアを計算
    let botScore = null;
    let botTags: string[] = [];
    
    // Cloudflare Bot Scoreがあれば使用
    if (cfBotScore) {
      const scoreNum = parseInt(cfBotScore, 10);
      botScore = scoreNum / 100; // 0-99 を 0-1 に正規化
    } 
    
    // Bot Management情報を解析
    if (cfBotTags) {
      try {
        const botManagementData = JSON.parse(cfBotTags);
        if (botManagementData.ja3 && botManagementData.ja3.verified_bot) {
          botTags.push('verified_bot');
        }
        if (botManagementData.ja3 && botManagementData.ja3.suspected_bot) {
          botTags.push('suspected_bot');
        }
      } catch (parseError) {
        console.error('Bot Managementデータ解析エラー:', parseError);
      }
    }
    
    // User-Agent判定結果をタグに追加
    if (isBot && !botTags.includes('user-agent-bot')) {
      botTags.push('user-agent-bot');
    }
    
    return NextResponse.json({
      botScore, 
      botTags,
      cloudflare: {
        cfRay,
        cfConnectingIp,
        hasBotHeaders: !!cfBotScore || !!cfBotTags
      },
      userAgent,
      isBot
    });
  } catch (error) {
    console.error('Cloudflare情報取得エラー:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Bot情報の取得に失敗しました'
      },
      { status: 500 }
    );
  }
}