import { NextRequest, NextResponse } from 'next/server';

// Turnstile検証関数
async function verifyTurnstileToken(token: string): Promise<{
  success: boolean;
  error_codes?: string[];
  challenge_ts?: string;
  hostname?: string;
}> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  
  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY is not set');
    return { success: false, error_codes: ['missing-secret-key'] };
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error('Turnstile API HTTP error:', response.status, response.statusText);
      return { success: false, error_codes: ['http-error'] };
    }

    const result = await response.json();
    console.log('Turnstile verification result:', result);
    return result;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return { success: false, error_codes: ['network-error'] };
  }
}

// お問い合わせ内容保存
const contactMessages: Array<{
  email: string;
  message: string;
  timestamp: Date;
  turnstileResult?: {
    success: boolean;
    challenge_ts?: string;
    hostname?: string;
    error_codes?: string[];
  };
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
    const { email, message, turnstileToken } = await request.json();

    // 入力検証
    if (!email || !message) {
      return NextResponse.json(
        { error: 'メールアドレスとお問い合わせ内容は必須です' },
        { status: 400 }
      );
    }

    // Turnstile検証
    let turnstileResult = null;
    if (turnstileToken) {
      console.log('Contact2 API: Turnstile検証開始');
      turnstileResult = await verifyTurnstileToken(turnstileToken);
      console.log('Contact2 API: Turnstile検証結果:', turnstileResult);
      
      if (!turnstileResult.success) {
        return NextResponse.json(
          { 
            error: 'Bot検証に失敗しました。もう一度お試しください。',
            turnstile_errors: turnstileResult.error_codes
          },
          { status: 400 }
        );
      }
    } else {
      console.log('Contact2 API: Turnstileトークンなし');
      return NextResponse.json(
        { error: 'Bot検証が必要です' },
        { status: 400 }
      );
    }

    // User-Agent取得
    const userAgent = request.headers.get('user-agent') || '';

    // お問い合わせメッセージを保存
    contactMessages.push({
      email,
      message,
      timestamp: new Date(),
      turnstileResult,
      userAgent,
      clientHeaders: headers
    });

    // デバッグ用にコンソールに出力
    console.log('お問い合わせを受け付けました (Turnstile):', {
      email,
      message: message.substring(0, 20) + (message.length > 20 ? '...' : ''),
      turnstileSuccess: turnstileResult?.success,
      turnstileHostname: turnstileResult?.hostname,
      turnstileTimestamp: turnstileResult?.challenge_ts
    });

    // レスポンスを返す
    const response = NextResponse.json({
      success: true,
      message: 'お問い合わせを受け付けました',
      turnstile: {
        success: turnstileResult?.success,
        hostname: turnstileResult?.hostname,
        challenge_ts: turnstileResult?.challenge_ts
      },
      debug: {
        userAgent,
        timestamp: new Date().toISOString()
      }
    });
    
    // カスタムヘッダーの追加
    response.headers.set('X-Bot-Detection-Type', 'Cloudflare-Turnstile');
    return response;
    
  } catch (error) {
    console.error('お問い合わせ処理中のエラー (Turnstile):', error);
    
    return NextResponse.json(
      { error: 'お問い合わせ処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}