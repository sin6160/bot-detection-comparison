import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Cloudflareからの情報を取得
    const userAgent = request.headers.get('user-agent') || '';
    const cfRay = request.headers.get('cf-ray');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    // Bot Fight Mode関連ヘッダー
    // cf-bot-scoreは通常は0-99の値だが、Bot Management製品でのみ提供される
    const cfBotScore = request.headers.get('cf-bot-score');
    // Bot Management情報（JSON形式）
    const cfBotTags = request.headers.get('cf-bot-management');
    // Bot Fight Mode検出時のヘッダー
    const cfWaf = request.headers.get('cf-waf'); // セキュリティスコア全般
    const cfThreatScore = request.headers.get('cf-threat-score'); // 0-100の脅威スコア
    
    // JavaScript detections結果 - クライアントから送られたヘッダーを確認
    const cfJsDetectionHeader = request.headers.get('x-cf-js-detection-result');
    // cf_clearanceクッキーを確認（ある場合）
    const cookies = request.headers.get('cookie') || '';
    const hasCfClearance = cookies.includes('cf_clearance=');
    
    // デバッグ用にすべてのヘッダーを出力
    console.log('Request headers:', Object.fromEntries(request.headers));
    
    // User-Agentベースの簡易ボット検知
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python-requests/i
    ];
    
    const isBot = botPatterns.some(pattern => pattern.test(userAgent));
    
    // 正規化したスコアを計算
    let botScore = null;
    const botTags: string[] = [];
    
    // JavaScript detections結果の判定
    let jsDetectionPassed = null;
    
    // カスタムヘッダーから取得
    if (cfJsDetectionHeader) {
      jsDetectionPassed = cfJsDetectionHeader.toLowerCase() === 'passed';
      if (jsDetectionPassed) {
        botTags.push('js_detection_passed');
      } else {
        botTags.push('js_detection_failed');
      }
    }
    // cf_clearanceクッキーの存在から推測
    else if (hasCfClearance) {
      jsDetectionPassed = true;
      botTags.push('cf_clearance_cookie_present');
    }
    
    // Bot Scoreの計算 (高いほど人間らしい)
    if (cfBotScore) {
      // cfBotScoreは0-99のスケール (値が高いほどbot確度が低い)
      const scoreNum = parseInt(cfBotScore, 10);
      botScore = scoreNum / 100; // 0-99 を 0-1 に正規化
    } else if (cfThreatScore) {
      // cf-threat-scoreは0-100のスケール (値が高いほど脅威度が高い)
      // 逆スケールにして0-1に正規化 (高いほど人間らしい)
      const threatScoreNum = parseInt(cfThreatScore, 10);
      botScore = 1 - (threatScoreNum / 100);
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
        // jsDetection情報も取得する
        if (botManagementData.jsDetection) {
          if (botManagementData.jsDetection.passed) {
            botTags.push('js_detection_passed_official');
            jsDetectionPassed = true;
          } else if (botManagementData.jsDetection.failed) {
            botTags.push('js_detection_failed_official');
            jsDetectionPassed = false;
          }
        }
      } catch (parseError) {
        console.error('Bot Managementデータ解析エラー:', parseError);
      }
    }
    
    // WAF検出をタグに追加
    if (cfWaf) {
      botTags.push(`waf_detected:${cfWaf}`);
    }
    
    // User-Agent判定結果をタグに追加
    if (isBot && !botTags.includes('user-agent-bot')) {
      botTags.push('user-agent-bot');
    }
    
    // JavaScript detectionsの結果をスコア調整に利用
    if (jsDetectionPassed === false) {
      // JavaScript検証に失敗した場合は、より厳しくスコアを調整
      if (botScore === null || botScore > 0.3) {
        botScore = 0.3; // 検証失敗したらボットの可能性を高めに設定
      }
      botTags.push('js_detection_adjusted_score');
    } else if (jsDetectionPassed === true && botScore === null) {
      // JavaScript検証に通過したが、スコアがまだ設定されていない場合
      botScore = 0.7; // より人間らしいと判定
      botTags.push('js_detection_base_score');
    }
    
    // 検出情報がない場合、User-Agentベースでスコアを仮定
    if (botScore === null) {
      botScore = isBot ? 0.2 : 0.8; // ボットと判定されれば低いスコア、そうでなければ高いスコア
    }
    
    return NextResponse.json({
      botScore, 
      botTags,
      jsDetectionPassed,
      cloudflare: {
        cfRay,
        cfConnectingIp,
        cfThreatScore,
        cfWaf,
        hasBotHeaders: !!cfBotScore || !!cfBotTags || !!cfThreatScore || !!cfWaf,
        hasCfClearance
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