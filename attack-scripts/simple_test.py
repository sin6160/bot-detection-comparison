#!/usr/bin/env python3
"""
簡易版 Cloudflare Bot Fight Mode テストスクリプト

ChromeDriverの問題を回避するため、requestsライブラリを使用した
シンプルなHTTPリクエストベースのテストスクリプトです。
"""

import time
import argparse
import logging
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List
import random
import string

import requests

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('attack-scripts/simple_test.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class SimpleBotTester:
    """シンプルなHTTPリクエストベースのBotテスタークラス"""
    
    def __init__(self, target_url: str, api_endpoint: str = None):
        self.target_url = target_url
        # APIエンドポイントが指定されていない場合は、target_urlから推測
        if api_endpoint is None:
            base_url = target_url.replace('/contact', '')
            self.api_endpoint = f"{base_url}/api/contact"
        else:
            self.api_endpoint = api_endpoint
        self.results = []
        
        # セッションを作成（Cookieなどを保持）
        self.session = requests.Session()
        
        # 一般的なブラウザのUser-Agentを設定
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Content-Type': 'application/json'
        })
    
    def generate_random_email(self) -> str:
        """ランダムなメールアドレスを生成"""
        username = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        domains = ['test.com', 'example.org', 'sample.net', 'demo.jp', 'testing.co.jp']
        return f"{username}@{random.choice(domains)}"
    
    def generate_random_message(self) -> str:
        """ランダムなメッセージを生成"""
        messages = [
            "お問い合わせテストです。よろしくお願いします。",
            "サービスについて詳しく教えてください。価格や機能について知りたいです。",
            "料金プランについて質問があります。企業向けプランはありますか？",
            "技術的な質問があります。APIの利用方法について教えてください。",
            "導入を検討しています。デモやトライアルは可能でしょうか？",
            "セキュリティ機能について詳しく知りたいです。",
            "サポート体制について教えてください。",
            "実装方法について相談したいことがあります。"
        ]
        return random.choice(messages)
    
    def submit_contact_form(self, thread_id: int, attempt: int) -> Dict:
        """コンタクトフォームにデータを送信"""
        start_time = time.time()
        result = {
            'thread_id': thread_id,
            'attempt': attempt,
            'timestamp': datetime.now().isoformat(),
            'success': False,
            'error': None,
            'response_time': 0,
            'status_code': None,
            'cloudflare_blocked': False,
            'challenge_detected': False,
            'bot_score': None,
            'response_headers': {},
            'cloudflare_headers': {}
        }
        
        try:
            # ランダムなフォームデータを生成
            email = self.generate_random_email()
            message = self.generate_random_message()
            
            form_data = {
                'email': email,
                'message': message,
                'recaptchaToken': ''  # 実際のreCAPTCHAトークンは取得困難なため空で送信
            }
            
            logger.info(f"Thread {thread_id}, Attempt {attempt}: Sending POST to {self.api_endpoint}")
            
            # APIエンドポイントにPOSTリクエストを送信
            # Accept-Encodingを制限してBrotli圧縮を回避
            headers = self.session.headers.copy()
            headers['Accept-Encoding'] = 'gzip, deflate'
            
            response = self.session.post(
                self.api_endpoint,
                json=form_data,
                timeout=30,
                headers=headers
            )
            
            result['status_code'] = response.status_code
            result['response_headers'] = dict(response.headers)
            
            # デバッグ: レスポンスヘッダーをログ出力
            logger.debug(f"Thread {thread_id}, Attempt {attempt}: Response headers: {dict(response.headers)}")
            
            # Cloudflare関連のヘッダーを抽出
            cloudflare_headers = {}
            for header, value in response.headers.items():
                if header.lower().startswith('cf-') or 'cloudflare' in header.lower():
                    cloudflare_headers[header] = value
            result['cloudflare_headers'] = cloudflare_headers
            
            # レスポンスの解析
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    if response_data.get('success'):
                        result['success'] = True
                        logger.info(f"Thread {thread_id}, Attempt {attempt}: Form submission successful")
                        
                        # Bot スコア情報を取得
                        if 'scores' in response_data:
                            scores = response_data['scores']
                            if 'recaptcha' in scores and scores['recaptcha'] is not None:
                                result['bot_score'] = scores['recaptcha']
                    else:
                        result['error'] = response_data.get('error', 'Unknown API error')
                        logger.warning(f"Thread {thread_id}, Attempt {attempt}: API error: {result['error']}")
                        
                except json.JSONDecodeError as e:
                    result['error'] = f"Invalid JSON response: {str(e)}"
                    logger.error(f"Thread {thread_id}, Attempt {attempt}: Invalid JSON response. Response text: {response.text[:200]}...")
                except Exception as e:
                    result['error'] = f"JSON parsing error: {str(e)}"
                    logger.error(f"Thread {thread_id}, Attempt {attempt}: JSON parsing error: {e}. Response text: {response.text[:200]}...")
            
            elif response.status_code == 403:
                result['cloudflare_blocked'] = True
                result['error'] = "Cloudflare blocked (403)"
                logger.warning(f"Thread {thread_id}, Attempt {attempt}: Cloudflare blocked (403)")
            
            elif response.status_code == 429:
                result['error'] = "Rate limited (429)"
                logger.warning(f"Thread {thread_id}, Attempt {attempt}: Rate limited (429)")
            
            elif response.status_code in [503, 520, 521, 522, 523, 524]:
                result['challenge_detected'] = True
                result['error'] = f"Cloudflare challenge/error ({response.status_code})"
                logger.warning(f"Thread {thread_id}, Attempt {attempt}: Cloudflare challenge/error ({response.status_code})")
            
            else:
                result['error'] = f"HTTP {response.status_code}"
                logger.warning(f"Thread {thread_id}, Attempt {attempt}: HTTP {response.status_code}")
            
            # Cloudflareの検知を確認
            response_text = response.text.lower()
            if any(keyword in response_text for keyword in ['cloudflare', 'checking your browser', 'ddos protection']):
                result['challenge_detected'] = True
                logger.info(f"Thread {thread_id}, Attempt {attempt}: Cloudflare challenge page detected")
                
        except requests.exceptions.Timeout:
            result['error'] = "Request timeout"
            logger.error(f"Thread {thread_id}, Attempt {attempt}: Request timeout")
            
        except requests.exceptions.ConnectionError as e:
            result['error'] = f"Connection error: {str(e)}"
            logger.error(f"Thread {thread_id}, Attempt {attempt}: Connection error: {e}")
            
        except Exception as e:
            result['error'] = f"Unexpected error: {str(e)}"
            logger.error(f"Thread {thread_id}, Attempt {attempt}: Unexpected error: {e}")
        
        finally:
            result['response_time'] = time.time() - start_time
        
        return result
    
    def run_test(self, num_requests: int = 50, num_threads: int = 5, delay: float = 0.1) -> Dict:
        """テストを実行"""
        logger.info(f"Starting Simple Bot Fight Mode test")
        logger.info(f"Target URL: {self.target_url}")
        logger.info(f"API Endpoint: {self.api_endpoint}")
        logger.info(f"Number of requests: {num_requests}")
        logger.info(f"Number of threads: {num_threads}")
        logger.info(f"Delay between requests: {delay}s")
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = []
            
            for i in range(num_requests):
                thread_id = i % num_threads
                future = executor.submit(self.submit_contact_form, thread_id, i)
                futures.append(future)
                
                # リクエスト間隔制御
                if delay > 0:
                    time.sleep(delay)
            
            # 結果を収集
            for future in as_completed(futures):
                try:
                    result = future.result()
                    self.results.append(result)
                    
                    # リアルタイムでログ出力
                    status = "SUCCESS" if result['success'] else "FAILED"
                    error_info = f" ({result['error']})" if result['error'] else ""
                    cf_info = ""
                    if result['cloudflare_blocked']:
                        cf_info = " [CF-BLOCKED]"
                    elif result['challenge_detected']:
                        cf_info = " [CF-CHALLENGE]"
                    
                    logger.info(f"Thread {result['thread_id']}, Attempt {result['attempt']}: {status}{error_info}{cf_info}")
                    
                except Exception as e:
                    logger.error(f"Error processing result: {e}")
        
        total_time = time.time() - start_time
        
        # 統計情報を計算
        stats = self.calculate_statistics(total_time)
        
        # 結果をファイルに保存
        self.save_results(stats)
        
        return stats
    
    def calculate_statistics(self, total_time: float) -> Dict:
        """統計情報を計算"""
        total_requests = len(self.results)
        successful_requests = sum(1 for r in self.results if r['success'])
        failed_requests = total_requests - successful_requests
        
        cloudflare_blocks = sum(1 for r in self.results if r['cloudflare_blocked'])
        challenges_detected = sum(1 for r in self.results if r['challenge_detected'])
        
        response_times = [r['response_time'] for r in self.results if r['response_time'] > 0]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        bot_scores = [r['bot_score'] for r in self.results if r['bot_score'] is not None]
        avg_bot_score = sum(bot_scores) / len(bot_scores) if bot_scores else None
        
        # ステータスコード別の統計
        status_codes = {}
        for r in self.results:
            code = r['status_code']
            if code:
                status_codes[code] = status_codes.get(code, 0) + 1
        
        return {
            'test_summary': {
                'target_url': self.target_url,
                'api_endpoint': self.api_endpoint,
                'total_time': total_time,
                'total_requests': total_requests,
                'successful_requests': successful_requests,
                'failed_requests': failed_requests,
                'success_rate': (successful_requests / total_requests * 100) if total_requests > 0 else 0
            },
            'cloudflare_detection': {
                'blocks': cloudflare_blocks,
                'challenges_detected': challenges_detected,
                'block_rate': (cloudflare_blocks / total_requests * 100) if total_requests > 0 else 0,
                'challenge_rate': (challenges_detected / total_requests * 100) if total_requests > 0 else 0
            },
            'performance': {
                'avg_response_time': avg_response_time,
                'requests_per_second': total_requests / total_time if total_time > 0 else 0
            },
            'status_codes': status_codes,
            'bot_scores': {
                'avg_score': avg_bot_score,
                'total_scores_received': len(bot_scores),
                'scores': bot_scores
            },
            'detailed_results': self.results
        }
    
    def save_results(self, stats: Dict):
        """結果をJSONファイルに保存"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"attack-scripts/simple_test_results_{timestamp}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Results saved to: {filename}")


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(description='Simple Bot Fight Mode Tester')
    parser.add_argument('--url', default='https://dev.saito-sandbox-dev.com/contact',
                       help='Target URL (default: https://dev.saito-sandbox-dev.com/contact)')
    parser.add_argument('--api', 
                       help='API endpoint URL (default: auto-detect from URL)')
    parser.add_argument('--requests', type=int, default=20,
                       help='Number of requests to send (default: 20)')
    parser.add_argument('--threads', type=int, default=3,
                       help='Number of concurrent threads (default: 3)')
    parser.add_argument('--delay', type=float, default=0.2,
                       help='Delay between requests in seconds (default: 0.2)')
    
    args = parser.parse_args()
    
    # テスターを初期化
    tester = SimpleBotTester(
        target_url=args.url,
        api_endpoint=args.api
    )
    
    try:
        # テスト実行
        stats = tester.run_test(
            num_requests=args.requests,
            num_threads=args.threads,
            delay=args.delay
        )
        
        # 結果をコンソールに出力
        print("\n" + "="*60)
        print("SIMPLE BOT FIGHT MODE TEST RESULTS")
        print("="*60)
        print(f"Target URL: {stats['test_summary']['target_url']}")
        print(f"API Endpoint: {stats['test_summary']['api_endpoint']}")
        print(f"Total Time: {stats['test_summary']['total_time']:.2f}s")
        print(f"Total Requests: {stats['test_summary']['total_requests']}")
        print(f"Successful Requests: {stats['test_summary']['successful_requests']}")
        print(f"Failed Requests: {stats['test_summary']['failed_requests']}")
        print(f"Success Rate: {stats['test_summary']['success_rate']:.1f}%")
        print(f"Requests/Second: {stats['performance']['requests_per_second']:.2f}")
        print(f"Avg Response Time: {stats['performance']['avg_response_time']:.2f}s")
        print(f"Cloudflare Blocks: {stats['cloudflare_detection']['blocks']}")
        print(f"Block Rate: {stats['cloudflare_detection']['block_rate']:.1f}%")
        print(f"Cloudflare Challenges: {stats['cloudflare_detection']['challenges_detected']}")
        print(f"Challenge Rate: {stats['cloudflare_detection']['challenge_rate']:.1f}%")
        
        if stats['bot_scores']['avg_score'] is not None:
            print(f"Avg Bot Score: {stats['bot_scores']['avg_score']:.3f}")
        
        print("\nStatus Code Distribution:")
        for code, count in stats['status_codes'].items():
            print(f"  {code}: {count}")
        
        print("="*60)
        
    except KeyboardInterrupt:
        logger.info("Test interrupted by user")
    except Exception as e:
        logger.error(f"Test failed: {e}")
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())