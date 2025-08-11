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
}> = [];

export async function POST(request: NextRequest) {
  try {
    // リクエストからデータを取得
    const { email, message, recaptchaToken } = await request.json();

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

    // Cloudflare Bot Scoreを取得
    // cf-bot-score: Cloudflareによるbot確度スコア (0-99)
    let cloudflareBotScore: number | undefined;
    const cfBotScore = request.headers.get('cf-bot-score');
    if (cfBotScore) {
      const scoreNum = parseInt(cfBotScore, 10);
      cloudflareBotScore = scoreNum / 100; // 0-1の範囲に正規化
    }

    // お問い合わせメッセージを保存
    contactMessages.push({
      email,
      message,
      timestamp: new Date(),
      recaptchaScore,
      cloudflareBotScore
    });

    // デバッグ用にコンソールに出力
    console.log('お問い合わせを受け付けました:', {
      email,
      message: message.substring(0, 20) + (message.length > 20 ? '...' : ''),
      recaptchaScore,
      cloudflareBotScore
    });

    return NextResponse.json({
      success: true,
      message: 'お問い合わせを受け付けました',
      scores: {
        recaptcha: recaptchaScore,
        cloudflare: cloudflareBotScore
      }
    });
  } catch (error) {
    console.error('お問い合わせ処理中のエラー:', error);
    
    return NextResponse.json(
      { error: 'お問い合わせ処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}