#!/usr/bin/env python3
"""
実際のHTMLページに対するCloudflare Bot Fight Mode テストスクリプト

実際のHTMLページ構造に基づいて、フォーム操作を含む高速アクセステストを実行します。
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
import re

import requests
from bs4 import BeautifulSoup

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('attack-scripts/html_page_test.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class HTMLPageBotTester:
    """実際のHTMLページに対するBotテスタークラス"""
    
    def __init__(self, target_url: str):
        self.target_url = target_url
        self.results = []
        
        # セッションを作成（Cookieなどを保持）
        self.session = requests.Session()
        
        # 実際のブラウザのUser-Agentを設定
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1'
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
    
    def access_page_and_submit_form(self, thread_id: int, attempt: int) -> Dict:
        """HTMLページにアクセスしてフォームを送信"""
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
            'page_title': None,
            'form_found': False,
            'recaptcha_found': False,
            'response_headers': {},
            'cloudflare_headers': {}
        }
        
        try:
            logger.info(f"Thread {thread_id}, Attempt {attempt}: Accessing {self.target_url}")
            
            # Step 1: HTMLページにアクセス
            # Accept-Encodingを制限してBrotli圧縮を回避
            headers = self.session.headers.copy()
            headers['Accept-Encoding'] = 'gzip, deflate'
            
            response = self.session.get(
                self.target_url,
                timeout=30,
                headers=headers
            )
            
            result['status_code'] = response.status_code
            result['response_headers'] = dict(response.headers)
            
            # Cloudflare関連のヘッダーを抽出
            cloudflare_headers = {}
            for header, value in response.headers.items():
                if header.lower().startswith('cf-') or 'cloudflare' in header.lower():
                    cloudflare_headers[header] = value
            result['cloudflare_headers'] = cloudflare_headers
            
            # Cloudflareの検知を確認
            if response.status_code == 403:
                result['cloudflare_blocked'] = True
                result['error'] = "Cloudflare blocked (403)"
                logger.warning(f"Thread {thread_id}, Attempt {attempt}: Cloudflare blocked (403)")
                return result
            
            elif response.status_code == 429:
                result['error'] = "Rate limited (429)"
                logger.warning(f"Thread {thread_id}, Attempt {attempt}: Rate limited (429)")
                return result
            
            elif response.status_code in [503, 520, 521, 522, 523, 524]:
                result['challenge_detected'] = True
                result['error'] = f"Cloudflare challenge/error ({response.status_code})"
                logger.warning(f"Thread {thread_id}, Attempt {attempt}: Cloudflare challenge/error ({response.status_code})")
                return result
            
            if response.status_code != 200:
                result['error'] = f"HTTP {response.status_code}"
                logger.warning(f"Thread {thread_id}, Attempt {attempt}: HTTP {response.status_code}")
                return result
            
            # Step 2: HTMLを解析
            html_content = response.text.lower()
            
            # Cloudflareチャレンジページの検出
            if any(keyword in html_content for keyword in ['cloudflare', 'checking your browser', 'ddos protection', 'challenge']):
                result['challenge_detected'] = True
                logger.warning(f"Thread {thread_id}, Attempt {attempt}: Cloudflare challenge page detected")
            
            # BeautifulSoupでHTMLを解析
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # ページタイトルを取得
            title = soup.find('title')
            if title:
                result['page_title'] = title.get_text().strip()
            
            # フォームの存在確認
            email_field = soup.find('input', {'id': 'email', 'type': 'email'})
            message_field = soup.find('textarea', {'id': 'message'})
            submit_button = soup.find('button', {'type': 'submit'})
            
            if email_field and message_field and submit_button:
                result['form_found'] = True
                logger.info(f"Thread {thread_id}, Attempt {attempt}: Contact form found")
            else:
                result['error'] = "Contact form not found"
                logger.warning(f"Thread {thread_id}, Attempt {attempt}: Contact form not found")
                return result
            
            # reCAPTCHAの存在確認
            recaptcha_scripts = soup.find_all('script', src=re.compile(r'recaptcha|google\.com'))
            if recaptcha_scripts or 'recaptcha' in html_content:
                result['recaptcha_found'] = True
                logger.info(f"Thread {thread_id}, Attempt {attempt}: reCAPTCHA detected")
            
            # Step 3: フォームデータを準備してAPIに送信
            email = self.generate_random_email()
            message = self.generate_random_message()
            
            # APIエンドポイントにPOST
            api_url = self.target_url.replace('/contact', '/api/contact')
            
            form_data = {
                'email': email,
                'message': message,
                'recaptchaToken': ''  # 実際のreCAPTCHAトークンは取得困難なため空で送信
            }
            
            api_headers = headers.copy()
            api_headers.update({
                'Content-Type': 'application/json',
                'Referer': self.target_url,
                'Origin': self.target_url.rsplit('/', 1)[0],
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin'
            })
            
            api_response = self.session.post(
                api_url,
                json=form_data,
                timeout=30,
                headers=api_headers
            )
            
            if api_response.status_code == 200:
                try:
                    api_data = api_response.json()
                    if api_data.get('success'):
                        result['success'] = True
                        logger.info(f"Thread {thread_id}, Attempt {attempt}: Form submission successful")
                    else:
                        result['error'] = api_data.get('error', 'API error')
                        logger.warning(f"Thread {thread_id}, Attempt {attempt}: API error: {result['error']}")
                except json.JSONDecodeError:
                    result['error'] = "Invalid API response"
                    logger.error(f"Thread {thread_id}, Attempt {attempt}: Invalid API response")
            else:
                result['error'] = f"API HTTP {api_response.status_code}"
                logger.warning(f"Thread {thread_id}, Attempt {attempt}: API HTTP {api_response.status_code}")
                
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
    
    def run_test(self, num_requests: int = 30, num_threads: int = 5, delay: float = 0.2) -> Dict:
        """テストを実行"""
        logger.info(f"Starting HTML Page Bot Fight Mode test")
        logger.info(f"Target URL: {self.target_url}")
        logger.info(f"Number of requests: {num_requests}")
        logger.info(f"Number of threads: {num_threads}")
        logger.info(f"Delay between requests: {delay}s")
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = []
            
            for i in range(num_requests):
                thread_id = i % num_threads
                future = executor.submit(self.access_page_and_submit_form, thread_id, i)
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
                    
                    form_info = " [FORM-FOUND]" if result['form_found'] else " [NO-FORM]"
                    recaptcha_info = " [RECAPTCHA]" if result['recaptcha_found'] else ""
                    
                    logger.info(f"Thread {result['thread_id']}, Attempt {result['attempt']}: {status}{error_info}{cf_info}{form_info}{recaptcha_info}")
                    
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
        forms_found = sum(1 for r in self.results if r['form_found'])
        recaptcha_found = sum(1 for r in self.results if r['recaptcha_found'])
        
        response_times = [r['response_time'] for r in self.results if r['response_time'] > 0]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # ステータスコード別の統計
        status_codes = {}
        for r in self.results:
            code = r['status_code']
            if code:
                status_codes[code] = status_codes.get(code, 0) + 1
        
        # ページタイトルの確認
        page_titles = [r['page_title'] for r in self.results if r['page_title']]
        unique_titles = list(set(page_titles))
        
        return {
            'test_summary': {
                'target_url': self.target_url,
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
            'page_analysis': {
                'forms_found': forms_found,
                'form_detection_rate': (forms_found / total_requests * 100) if total_requests > 0 else 0,
                'recaptcha_found': recaptcha_found,
                'recaptcha_detection_rate': (recaptcha_found / total_requests * 100) if total_requests > 0 else 0,
                'unique_page_titles': unique_titles
            },
            'performance': {
                'avg_response_time': avg_response_time,
                'requests_per_second': total_requests / total_time if total_time > 0 else 0
            },
            'status_codes': status_codes,
            'detailed_results': self.results
        }
    
    def save_results(self, stats: Dict):
        """結果をJSONファイルに保存"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"attack-scripts/html_page_test_results_{timestamp}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Results saved to: {filename}")


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(description='HTML Page Bot Fight Mode Tester')
    parser.add_argument('--url', default='https://dev.saito-sandbox-dev.com/contact',
                       help='Target URL (default: https://dev.saito-sandbox-dev.com/contact)')
    parser.add_argument('--requests', type=int, default=30,
                       help='Number of requests to send (default: 30)')
    parser.add_argument('--threads', type=int, default=5,
                       help='Number of concurrent threads (default: 5)')
    parser.add_argument('--delay', type=float, default=0.2,
                       help='Delay between requests in seconds (default: 0.2)')
    
    args = parser.parse_args()
    
    # テスターを初期化
    tester = HTMLPageBotTester(target_url=args.url)
    
    try:
        # テスト実行
        stats = tester.run_test(
            num_requests=args.requests,
            num_threads=args.threads,
            delay=args.delay
        )
        
        # 結果をコンソールに出力
        print("\n" + "="*70)
        print("HTML PAGE BOT FIGHT MODE TEST RESULTS")
        print("="*70)
        print(f"Target URL: {stats['test_summary']['target_url']}")
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
        print(f"Forms Found: {stats['page_analysis']['forms_found']}")
        print(f"Form Detection Rate: {stats['page_analysis']['form_detection_rate']:.1f}%")
        print(f"reCAPTCHA Found: {stats['page_analysis']['recaptcha_found']}")
        print(f"reCAPTCHA Detection Rate: {stats['page_analysis']['recaptcha_detection_rate']:.1f}%")
        
        print("\nStatus Code Distribution:")
        for code, count in stats['status_codes'].items():
            print(f"  {code}: {count}")
        
        if stats['page_analysis']['unique_page_titles']:
            print("\nDetected Page Titles:")
            for title in stats['page_analysis']['unique_page_titles']:
                print(f"  '{title}'")
        
        print("="*70)
        
    except KeyboardInterrupt:
        logger.info("Test interrupted by user")
    except Exception as e:
        logger.error(f"Test failed: {e}")
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())