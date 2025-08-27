import { NextRequest, NextResponse } from 'next/server';
import { verifyRecaptchaToken } from '@/app/lib/recaptcha';

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
    let recaptchaScore: number | null = null;
    if (recaptchaToken) {
      console.log('Contact API: reCAPTCHA検証開始');
      const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'submit');
      console.log('Contact API: reCAPTCHA検証結果:', recaptchaResult);
      if (recaptchaResult.valid) {
        recaptchaScore = recaptchaResult.score;
      } else {
        console.error('Contact API: reCAPTCHA検証失敗:', recaptchaResult);
      }
    } else {
      console.log('Contact API: reCAPTCHAトークンなし');
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
      recaptchaScore: recaptchaScore ?? undefined,
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