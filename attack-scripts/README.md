# Cloudflare Bot Fight Mode テストスクリプト

このディレクトリには、Cloudflare Bot Fight Modeの動作を検証するためのPythonスクリプトが含まれています。

## 概要

`cloudflare_bot_test.py` は、Seleniumを使用してWebブラウザを自動化し、指定されたコンタクトフォームに対して高速で連続してアクセス・送信を行うことで、Cloudflareのbot検知機能が正常に動作するかを検証します。

## 機能

- **並列処理**: 複数のブラウザインスタンスを同時実行
- **高速送信**: 設定可能な間隔での連続送信
- **Bot検知監視**: Cloudflareのチャレンジやブロックを検出
- **統計分析**: 成功率、応答時間、検知率などの詳細な統計
- **結果保存**: JSON形式での詳細な結果保存
- **リアルタイムログ**: 実行中のリアルタイム状況表示

## 使用方法

### 基本実行
```bash
poetry run python attack-scripts/cloudflare_bot_test.py
```

### オプション付き実行
```bash
# カスタムURL、リクエスト数、スレッド数を指定
poetry run python attack-scripts/cloudflare_bot_test.py \
  --url https://dev.saito-sandbox-dev.com/contact \
  --requests 100 \
  --threads 10 \
  --delay 0.05

# ブラウザを表示して実行（デバッグ用）
poetry run python attack-scripts/cloudflare_bot_test.py --no-headless

# カスタムUser-Agentを使用
poetry run python attack-scripts/cloudflare_bot_test.py \
  --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
```

## コマンドラインオプション

| オプション | デフォルト値 | 説明 |
|-----------|-------------|------|
| `--url` | `https://dev.saito-sandbox-dev.com/contact` | テスト対象のURL |
| `--requests` | `50` | 送信するリクエスト数 |
| `--threads` | `5` | 並列実行するスレッド数 |
| `--delay` | `0.1` | リクエスト間の待機時間（秒） |
| `--no-headless` | `False` | ブラウザを表示モードで実行 |
| `--user-agent` | `None` | カスタムUser-Agentを指定 |

## 出力される情報

### コンソール出力
- リアルタイムでの実行状況
- 最終的な統計サマリー
- 成功率、応答時間、検知率など

### ログファイル
- `attack-scripts/cloudflare_bot_test.log`: 詳細な実行ログ

### 結果ファイル
- `attack-scripts/cloudflare_test_results_YYYYMMDD_HHMMSS.json`: 詳細な結果データ

## 結果の解釈

### 期待される動作
正常にCloudflare Bot Fight Modeが動作している場合、以下の現象が観測されるはずです：

1. **高いチャレンジ率**: 自動化されたアクセスに対してJavaScriptチャレンジが発動
2. **ブロック発生**: 明らかなbot行動に対するブロック
3. **低い成功率**: 連続的な高速アクセスの大部分が阻止される
4. **長い応答時間**: チャレンジ処理による応答時間の増加

### 結果例
```
CLOUDFLARE BOT FIGHT MODE TEST RESULTS
==================================================
Target URL: https://dev.saito-sandbox-dev.com/contact
Total Time: 45.23s
Total Requests: 50
Successful Requests: 12
Failed Requests: 38
Success Rate: 24.0%
Requests/Second: 1.11
Avg Response Time: 8.34s
Cloudflare Challenges: 35
Challenge Rate: 70.0%
Cloudflare Blocks: 15
reCAPTCHA Found: 50
Avg Bot Score: 0.15
==================================================
```

## 注意事項

### セキュリティとモラル
- このスクリプトは**防御機能のテスト目的のみ**で使用してください
- 自分が管理するサイトまたは明示的に許可されたサイトでのみ使用
- 他人のサイトに対する無許可での使用は禁止

### 技術的制限
- ChromeDriverが自動的にダウンロード・インストールされます
- ヘッドレスモードでの実行がデフォルト（`--no-headless`で変更可）
- 大量の並列実行はシステムリソースを消費します

### トラブルシューティング
1. **ChromeDriverエラー**: webdriver-managerが自動解決しますが、手動でChromeを最新版に更新してください
2. **タイムアウトエラー**: `--delay`を増やして負荷を軽減してください
3. **メモリ不足**: `--threads`を減らして並列数を制限してください

## カスタマイズ

スクリプトは以下の要素をカスタマイズできます：

- フォーム入力データ（ランダム生成される）
- User-Agentやブラウザオプション
- 待機時間やタイムアウト設定
- 結果の保存形式や場所

詳細なカスタマイズについては、スクリプト内のコメントを参照してください。