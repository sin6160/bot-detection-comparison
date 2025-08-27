/**
 * reCAPTCHA Enterprise 検証用の共通関数
 */

// 環境変数からreCAPTCHA設定を取得
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
const API_KEY = process.env.GOOGLE_API_KEY || '';

export interface RecaptchaVerificationResult {
  valid: boolean;
  score: number;
  action?: string;
  reasons?: string[];
  assessmentId?: string;
}

/**
 * reCAPTCHAトークンを検証する共通関数
 */
export async function verifyRecaptchaToken(
  token: string, 
  expectedAction: string = 'submit'
): Promise<RecaptchaVerificationResult> {
  try {
    // デバッグ用：環境変数の確認
    console.log('reCAPTCHA設定確認:', {
      PROJECT_ID: PROJECT_ID ? `設定済み (${PROJECT_ID})` : '未設定',
      RECAPTCHA_SITE_KEY: RECAPTCHA_SITE_KEY ? `設定済み (${RECAPTCHA_SITE_KEY.substring(0, 20)}...)` : '未設定',
      API_KEY: API_KEY ? `設定済み (${API_KEY.substring(0, 20)}...)` : '未設定'
    });
    // リクエストボディを作成
    const requestBody = {
      event: {
        token,
        siteKey: RECAPTCHA_SITE_KEY,
        expectedAction
      }
    };

    // REST API使用（API Key認証）- タイムアウト設定追加
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒でタイムアウト

    const response = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${PROJECT_ID}/assessments?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    console.log('reCAPTCHA Enterprise APIステータス:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('reCAPTCHA Enterprise API HTTPエラー:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return { 
        valid: false, 
        score: 0, 
        action: '',
        reasons: [`HTTP ${response.status}: ${response.statusText}`] 
      };
    }

    const assessment = await response.json();
    console.log('reCAPTCHA Enterprise APIレスポンス:', assessment);
    console.log('生のスコア値:', assessment.riskAnalysis?.score);
    console.log('スコアの型:', typeof assessment.riskAnalysis?.score);

    // レスポンスのエラーチェック
    if (assessment.error) {
      console.error('reCAPTCHA Enterprise APIエラー:', assessment.error);
      return { 
        valid: false, 
        score: 0, 
        action: '',
        reasons: [assessment.error.message || 'API Error'] 
      };
    }

    // トークンの検証
    if (!assessment.tokenProperties?.valid) {
      console.error(`トークンが無効です: ${assessment.tokenProperties?.invalidReason || 'Unknown reason'}`);
      console.error('トークンプロパティ詳細:', assessment.tokenProperties);
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
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('reCAPTCHA Enterprise API タイムアウト:', error);
        return { valid: false, score: 0, reasons: ['API timeout'] };
      }
      console.error('reCAPTCHA Enterprise API エラー:', error.message);
    } else {
      console.error('reCAPTCHA Enterprise API 未知のエラー:', error);
    }
    return { valid: false, score: 0, reasons: ['API error'] };
  }
}