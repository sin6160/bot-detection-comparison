import { NextRequest, NextResponse } from 'next/server';

// reCAPTCHA検証用の関数をインポート
// 実際にはimportするべきだが、ここでは簡単のために再定義します
async function verifyRecaptchaToken(token: string, action: string) {
  const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
  const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
  const API_KEY = process.env.GOOGLE_API_KEY || '';

  try {
    // リクエストボディを作成
    const requestBody = {
      event: {
        token,
        siteKey: RECAPTCHA_SITE_KEY,
        expectedAction: action
      }
    };

    // REST API使用（API Key認証）
    const response = await fetch(`https://recaptchaenterprise.googleapis.com/v1/projects/${PROJECT_ID}/assessments?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const assessment = await response.json();

    // トークンの検証
    if (!assessment.tokenProperties?.valid) {
      return { 
        valid: false, 
        score: 0
      };
    }

    // 結果の返却
    return {
      valid: true,
      score: assessment.riskAnalysis?.score || 0
    };

  } catch (error) {
    console.error('reCAPTCHA Enterprise API エラー:', error);
    return { valid: false, score: 0 };
  }
}

// お問い合わせ内容保存
const contactMessages: Array<{
  email: string;
  message: string;
  timestamp: Date;
  recaptchaScore?: number;
  cloudflareBotScore?: number;
  cloudflareJsDetectionPassed?: boolean | null;
  userAgent?: string;
  clientHeaders?: Record<string, string>;
}> = [];

export async function POST(request: NextRequest) {
  try {
    // 全てのヘッダーを取得
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // リクエストからデータを取得
    const { email, message, recaptchaToken, botDetection } = await request.json();

    // 入力検証
    if (!email || !message) {
      return NextResponse.json(
        { error: 'メールアドレスとお問い合わせ内容は必須です' },
        { status: 400 }
      );
    }

    // reCAPTCHA検証
    let recaptchaScore = 0;
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'CONTACT_SUBMIT');
      recaptchaScore = recaptchaResult.score;
    }

    // Cloudflareの情報を取得
    // 1. cf-bot-score: Cloudflareによるbot確度スコア (0-99)
    let cloudflareBotScore: number | undefined;
    const cfBotScore = request.headers.get('cf-bot-score');
    if (cfBotScore) {
      const scoreNum = parseInt(cfBotScore, 10);
      cloudflareBotScore = scoreNum / 100; // 0-1の範囲に正規化
    }
    
    // 2. JavaScript Detectionの結果を取得
    let jsDetectionStatus: boolean | null = null;
    
    // クライアントから送られたカスタムヘッダーを確認
    const cfJsDetectionHeader = request.headers.get('x-cf-js-detection-status');
    if (cfJsDetectionHeader) {
      jsDetectionStatus = cfJsDetectionHeader.toLowerCase() === 'passed';
    } 
    // リクエストボディからの情報も取得
    else if (botDetection?.cloudflareJsDetectionPassed !== undefined) {
      jsDetectionStatus = botDetection.cloudflareJsDetectionPassed;
    }
    
    // 3. CF Clearanceクッキーの確認
    const hasCfClearance = (request.headers.get('cookie') || '').includes('cf_clearance=');
    
    // 4. cf-connecting-ip および cf-ipcountry
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    const cfIpCountry = request.headers.get('cf-ipcountry');

    // User-Agent取得
    const userAgent = request.headers.get('user-agent') || '';

    // お問い合わせメッセージを保存
    contactMessages.push({
      email,
      message,
      timestamp: new Date(),
      recaptchaScore,
      cloudflareBotScore,
      cloudflareJsDetectionPassed: jsDetectionStatus,
      userAgent,
      clientHeaders: headers
    });

    // デバッグ用にコンソールに出力
    console.log('お問い合わせを受け付けました:', {
      email,
      message: message.substring(0, 20) + (message.length > 20 ? '...' : ''),
      recaptchaScore,
      cloudflareBotScore,
      cloudflareJsDetectionPassed: jsDetectionStatus,
      hasCfClearance,
      cfConnectingIp,
      cfIpCountry
    });

    // カスタムヘッダーを追加してレスポンスを返す
    const response = NextResponse.json({
      success: true,
      message: 'お問い合わせを受け付けました',
      scores: {
        recaptcha: recaptchaScore,
        cloudflare: cloudflareBotScore,
        jsDetectionPassed: jsDetectionStatus
      },
      debug: {
        hasCfClearance,
        headers: {
          cfRay: request.headers.get('cf-ray') || null,
          cfConnectingIp,
          cfIpCountry
        }
      }
    });
    
    // カスタムヘッダーの追加
    response.headers.set('X-Bot-Detection-Type', 'Cloudflare-Bot-Fight-Mode');
    return response;
    
  } catch (error) {
    console.error('お問い合わせ処理中のエラー:', error);
    
    return NextResponse.json(
      { error: 'お問い合わせ処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}