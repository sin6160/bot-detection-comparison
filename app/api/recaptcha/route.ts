import { NextRequest, NextResponse } from 'next/server';
import { verifyRecaptchaToken } from '@/app/lib/recaptcha';

export async function POST(request: NextRequest) {
  try {
    // リクエストからトークンとアクションを取得
    const { token, action: expectedAction = 'submit' } = await request.json();
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'トークンが指定されていません',
      }, { status: 400 });
    }

    try {
      // 共通関数を使用してreCAPTCHA検証
      const verificationResult = await verifyRecaptchaToken(token, expectedAction);
      
      return NextResponse.json({
        success: verificationResult.valid,
        score: verificationResult.score,
        action: verificationResult.action,
        valid: verificationResult.valid,
        reasons: verificationResult.reasons || [],
        assessmentId: verificationResult.assessmentId
      });
    } catch (assessmentError) {
      console.error('reCAPTCHA Enterprise評価エラー:', assessmentError);
      
      // エラー時は失敗レスポンスを返す
      return NextResponse.json({
        success: false,
        error: 'reCAPTCHA検証に失敗しました'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('reCAPTCHA検証エラー:', error);
    
    return NextResponse.json(
      { success: false, error: 'reCAPTCHA検証中にエラーが発生しました' },
      { status: 500 }
    );
  }
}