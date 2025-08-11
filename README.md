# Bot検知サービス比較サイト

このサイトはreCAPTCHA EnterpriseとCloudflare Bot Fight Modeのbot検知機能を比較するためのデモサイトです。問い合わせフォームを通じて両サービスの検知スコアをリアルタイムで確認できます。

## 前提条件

### サーバーデプロイが必要

このサービスはサーバーへのデプロイが必要です。完全な機能を利用するには以下が必要です：

1. クラウドサーバー（AWS EC2等）
2. ドメインの取得と設定
3. SSL証明書（セキュリティ上の理由から必要）

ローカル環境では一部機能のテストは行えますが、本番と同等の機能を利用するにはサーバーへのデプロイが必要です。

### Cloudflare Bot Fight Mode 利用のための設定

Bot Fight Modeを利用するには下記の設定が必要です:

1. お名前.com等でドメインの取得
2. Cloudflareアカウント作成（無料）
3. ドメインをCloudflareに追加
4. ネームサーバーをCloudflareに変更
5. DNS設定でプロキシ有効化（オレンジクラウド）
6. Bot Fight ModeをON

### reCAPTCHA Enterprise 利用のための設定

reCAPTCHA Enterpriseを利用するには下記の設定が必要です:

1. Google Cloud Projectの作成
2. reCAPTCHA Enterprise APIの有効化
3. 請求先アカウントの設定（無料枠あり）
4. サービスアカウントキーの作成（サーバーサイド用）

## 機能概要

- 問い合わせフォームの実装（メールアドレス、問い合わせ内容）
- reCAPTCHA Enterprise検知機能の統合
- Cloudflare Bot Fight Mode検知機能の統合
- 画面左下にbot検知スコアをリアルタイム表示

## 使い方

1. サイトにアクセスする

2. 「お問い合わせ」ページに移動

3. フォームに入力して送信
   - メールアドレスと問い合わせ内容を入力
   - 送信ボタンをクリック

4. 画面左下に表示されるbot検知スコアを確認
   - reCAPTCHA: Google reCAPTCHA Enterpriseによる検知スコア
   - Cloudflare: Cloudflare Bot Fight Modeによる検知スコア
   - スコアが高いほど人間である確率が高いとされる

## スコアの読み方

- 0.0〜1.0の範囲で表示
- **高いスコア (0.7以上)**: 人間である確率が高い (緑色表示)
- **中程度のスコア (0.3〜0.7)**: 判定保留 (黄色表示)
- **低いスコア (0.3未満)**: botである確率が高い (赤色表示)

## 注意事項

- reCAPTCHA Enterpriseを正常に機能させるには、有効なAPIキーが必要です
- Cloudflare Bot Fight Modeの完全な機能を利用するには、Cloudflareでホスティングする必要があります
- ローカル環境では一部の機能が制限される場合があります

## 技術情報

- **フロントエンド**: Next.js, React, TailwindCSS
- **バックエンド**: Next.js API Routes
- **Bot検知**:
  - Google reCAPTCHA Enterprise
  - Cloudflare Bot Fight Mode

## ローカル開発

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# 本番モードで起動
npm start
```

## 環境変数設定

`.env`または`.env.local`ファイルで以下の環境変数を設定:

```
GOOGLE_CLOUD_PROJECT_ID=your-project-id
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key
GOOGLE_API_KEY=your-api-key
```

## サーバーデプロイ手順

1. サーバーを用意（AWS EC2、GCP、Azureなど）
2. Node.jsとnpmをインストール
3. リポジトリをサーバーにクローン
4. 必要な環境変数を設定
5. 依存関係をインストール：`npm install`
6. アプリケーションをビルド：`npm run build`
7. 本番モードで起動：`npm start`
8. プロセスマネージャ（PM2など）を使用してバックグラウンドで実行
9. 必要に応じてNginxやApacheを設定

サーバーへのデプロイ後、CloudflareやreCAPTCHA Enterpriseの設定を行います。