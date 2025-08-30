# playwright mcp
playwright-mouse-fork mcpを利用する

・https://dev.saito-sandbox-dev.com/contact へアクセスすること
・メールにtest@test、問い合わせ内容にtestです を入力すること
・日本語で回答すること
・マウスやキー入力は人間らしく振る舞うこと
・ヘッドレスモードをオフにする（headless: false）
・動作を遅くする（slowMo: 50）
・動的サイトであることに注意（"waitUntil": "networkidle"）
・アクセスごとにHTMLレスポンスを確認する
・playwright_mouse_moveを利用する
・マウス位置はブラウザの位置を考慮して左下に50pxずつ移動した位置とすること
・cloudflare turnsiteがあればチェックボックスをクリック

・起動例
{
  "url": "https://dev.saito-sandbox-dev.com/contact2",
  "browserType": "chromium",
  "headless": false,
  "width": 1280,
  "height": 720,
  "waitUntil": "networkidle",
  "slowMo": 50,
}

# 備忘録
npx yeswecan/mcp-playwright-fork

# chatgpt agent
・https://dev.saito-sandbox-dev.com/contact2 にアクセスして、test@test testです を入力
・cloudflare turnsiteがあればチェックボックスをクリック
・送信ボタンを押す
・マウスを人間のように、ゆっくり動かす
・許可必要ない