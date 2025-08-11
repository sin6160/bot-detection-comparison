import { NextRequest, NextResponse } from 'next/server';

// 環境変数からreCAPTCHA設定を取得
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
const API_KEY = process.env.GOOGLE_API_KEY || '';

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
      // Google reCAPTCHA Enterprise APIを使用して検証
      const assessmentResponse = await createAssessment(token, expectedAction);
      
      // 元のスコアを取得
      const originalScore = assessmentResponse.score || 0;
      
      return NextResponse.json({
        success: true,
        score: originalScore,
        action: assessmentResponse.action,
        valid: assessmentResponse.valid,
        reasons: assessmentResponse.reasons || [],
        assessmentId: assessmentResponse.assessmentId
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

/**
 * reCAPTCHA Enterprise APIを使用して評価を作成する
 */
async function createAssessment(token: string, expectedAction: string) {
  try {
    // リクエストボディを作成
    const requestBody = {
      event: {
        token,
        siteKey: RECAPTCHA_SITE_KEY,
        expectedAction
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
      console.error(`トークンが無効です: ${assessment.tokenProperties?.invalidReason || 'Unknown reason'}`);
      return { 
        valid: false, 
        score: 0, 
        action: '',
        reasons: [assessment.tokenProperties?.invalidReason || 'Invalid token'] 
      };
    }

    // アクションの確認
    if (assessment.tokenProperties.action !== expectedAction) {
      console.warn(`アクションが一致しません: ${assessment.tokenProperties.action} != ${expectedAction}`);
    }

    // 結果の返却
    return {
      valid: true,
      score: assessment.riskAnalysis?.score || 0,
      action: assessment.tokenProperties.action,
      reasons: assessment.riskAnalysis?.reasons || [],
      assessmentId: assessment.name
    };

  } catch (error) {
    console.error('reCAPTCHA Enterprise API エラー:', error);
    throw error;
  }
}