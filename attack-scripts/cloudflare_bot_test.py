#!/usr/bin/env python3
"""
Cloudflare Bot Fight Mode テストスクリプト

このスクリプトは、Cloudflare Bot Fight Modeが正常に機能しているかを
Seleniumを使用した高速アクセスによって検証します。

使用方法:
    poetry run python attack-scripts/cloudflare_bot_test.py
"""

import time
import argparse
import logging
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional
import random
import string

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager
import requests


# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('attack-scripts/cloudflare_bot_test.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class CloudflareBotTester:
    """Cloudflare Bot Fight Mode テスタークラス"""
    
    def __init__(self, target_url: str, headless: bool = True, user_agent: Optional[str] = None):
        self.target_url = target_url
        self.headless = headless
        self.user_agent = user_agent
        self.results = []
        
    def create_driver(self) -> webdriver.Chrome:
        """Chrome WebDriverを作成"""
        options = Options()
        
        if self.headless:
            options.add_argument('--headless')
        
        # Bot検知を回避するための一般的な設定
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # ウィンドウサイズ設定
        options.add_argument('--window-size=1920,1080')
        
        # User-Agent設定
        if self.user_agent:
            options.add_argument(f'--user-agent={self.user_agent}')
        
        # WebDriverManagerを使用してChromeDriverを自動管理
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        
        # webdriver検知回避
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        return driver
    
    def generate_random_email(self) -> str:
        """ランダムなメールアドレスを生成"""
        username = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        domains = ['test.com', 'example.org', 'sample.net', 'demo.jp']
        return f"{username}@{random.choice(domains)}"
    
    def generate_random_message(self) -> str:
        """ランダムなメッセージを生成"""
        messages = [
            "お問い合わせテストです。",
            "サービスについて詳しく教えてください。",
            "料金プランについて質問があります。",
            "技術的な質問があります。",
            "導入を検討しています。",
            "デモの依頼をお願いします。"
        ]
        return random.choice(messages)
    
    def submit_contact_form(self, thread_id: int, attempt: int) -> Dict:
        """コンタクトフォームを送信"""
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
            'recaptcha_found': False,
            'challenge_detected': False,
            'bot_score': None
        }
        
        driver = None
        try:
            driver = self.create_driver()
            
            # ページにアクセス
            logger.info(f"Thread {thread_id}, Attempt {attempt}: Accessing {self.target_url}")
            driver.get(self.target_url)
            
            # ページの読み込み待機
            wait = WebDriverWait(driver, 10)
            
            # Cloudflareのチャレンジページをチェック
            if "cloudflare" in driver.title.lower() or "checking your browser" in driver.page_source.lower():
                result['challenge_detected'] = True
                logger.warning(f"Thread {thread_id}, Attempt {attempt}: Cloudflare challenge detected")
                
                # チャレンジを待機（最大30秒）
                challenge_wait = WebDriverWait(driver, 30)
                try:
                    challenge_wait.until_not(
                        lambda d: "checking your browser" in d.page_source.lower()
                    )
                    logger.info(f"Thread {thread_id}, Attempt {attempt}: Challenge passed")
                except TimeoutException:
                    result['cloudflare_blocked'] = True
                    result['error'] = "Cloudflare challenge failed"
                    logger.error(f"Thread {thread_id}, Attempt {attempt}: Challenge failed")
                    return result
            
            # フォーム要素を取得
            try:
                email_field = wait.until(EC.presence_of_element_located((By.ID, "email")))
                message_field = driver.find_element(By.ID, "message")
                submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            except TimeoutException:
                result['error'] = "Form elements not found"
                logger.error(f"Thread {thread_id}, Attempt {attempt}: Form elements not found")
                return result
            
            # reCAPTCHAの存在確認
            recaptcha_elements = driver.find_elements(By.CSS_SELECTOR, ".g-recaptcha, iframe[src*='recaptcha']")
            if recaptcha_elements:
                result['recaptcha_found'] = True
                logger.info(f"Thread {thread_id}, Attempt {attempt}: reCAPTCHA detected")
            
            # フォームに入力
            email = self.generate_random_email()
            message = self.generate_random_message()
            
            email_field.clear()
            email_field.send_keys(email)
            message_field.clear()
            message_field.send_keys(message)
            
            # 送信前に少し待機（人間らしい動作をシミュレート）
            time.sleep(random.uniform(0.5, 2.0))
            
            # フォーム送信
            submit_button.click()
            
            # 送信後の結果を待機
            try:
                # 成功メッセージまたはエラーメッセージを待機
                wait.until(
                    EC.any_of(
                        EC.presence_of_element_located((By.CSS_SELECTOR, ".bg-green-100")),  # 成功メッセージ
                        EC.presence_of_element_located((By.CSS_SELECTOR, ".bg-red-100")),   # エラーメッセージ
                        EC.presence_of_element_located((By.CSS_SELECTOR, "[class*='error']"))
                    )
                )
                
                # ページの内容をチェック
                page_source = driver.page_source.lower()
                
                if "お問い合わせありがとうございます" in page_source or "success" in page_source:
                    result['success'] = True
                    logger.info(f"Thread {thread_id}, Attempt {attempt}: Form submission successful")
                else:
                    result['error'] = "Form submission failed"
                    logger.warning(f"Thread {thread_id}, Attempt {attempt}: Form submission failed")
                
                # Bot スコア情報を取得
                try:
                    bot_score_element = driver.find_element(By.CSS_SELECTOR, "[data-testid='bot-score-display']")
                    if bot_score_element:
                        score_text = bot_score_element.text
                        # スコアを抽出（例: "Bot Score: 0.85" から 0.85 を抽出）
                        import re
                        score_match = re.search(r'(\d+\.?\d*)', score_text)
                        if score_match:
                            result['bot_score'] = float(score_match.group(1))
                except:
                    pass  # Bot スコア要素が見つからない場合は無視
                
            except TimeoutException:
                result['error'] = "Response timeout"
                logger.warning(f"Thread {thread_id}, Attempt {attempt}: Response timeout")
            
        except WebDriverException as e:
            result['error'] = f"WebDriver error: {str(e)}"
            logger.error(f"Thread {thread_id}, Attempt {attempt}: WebDriver error: {e}")
        except Exception as e:
            result['error'] = f"Unexpected error: {str(e)}"
            logger.error(f"Thread {thread_id}, Attempt {attempt}: Unexpected error: {e}")
        finally:
            if driver:
                driver.quit()
            
            result['response_time'] = time.time() - start_time
        
        return result
    
    def run_test(self, num_requests: int = 50, num_threads: int = 5, delay: float = 0.1) -> Dict:
        """テストを実行"""
        logger.info(f"Starting Cloudflare Bot Fight Mode test")
        logger.info(f"Target URL: {self.target_url}")
        logger.info(f"Number of requests: {num_requests}")
        logger.info(f"Number of threads: {num_threads}")
        logger.info(f"Delay between requests: {delay}s")
        logger.info(f"Headless mode: {self.headless}")
        
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
                    logger.info(f"Thread {result['thread_id']}, Attempt {result['attempt']}: {status}{error_info}")
                    
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
        recaptcha_found = sum(1 for r in self.results if r['recaptcha_found'])
        
        response_times = [r['response_time'] for r in self.results if r['response_time'] > 0]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        bot_scores = [r['bot_score'] for r in self.results if r['bot_score'] is not None]
        avg_bot_score = sum(bot_scores) / len(bot_scores) if bot_scores else None
        
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
                'challenge_rate': (challenges_detected / total_requests * 100) if total_requests > 0 else 0
            },
            'recaptcha_info': {
                'found_instances': recaptcha_found,
                'detection_rate': (recaptcha_found / total_requests * 100) if total_requests > 0 else 0
            },
            'performance': {
                'avg_response_time': avg_response_time,
                'requests_per_second': total_requests / total_time if total_time > 0 else 0
            },
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
        filename = f"attack-scripts/cloudflare_test_results_{timestamp}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Results saved to: {filename}")


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(description='Cloudflare Bot Fight Mode Tester')
    parser.add_argument('--url', default='https://dev.saito-sandbox-dev.com/contact',
                       help='Target URL (default: https://dev.saito-sandbox-dev.com/contact)')
    parser.add_argument('--requests', type=int, default=50,
                       help='Number of requests to send (default: 50)')
    parser.add_argument('--threads', type=int, default=5,
                       help='Number of concurrent threads (default: 5)')
    parser.add_argument('--delay', type=float, default=0.1,
                       help='Delay between requests in seconds (default: 0.1)')
    parser.add_argument('--no-headless', action='store_true',
                       help='Run browser in non-headless mode (default: headless)')
    parser.add_argument('--user-agent', type=str,
                       help='Custom User-Agent string')
    
    args = parser.parse_args()
    
    # テスターを初期化
    tester = CloudflareBotTester(
        target_url=args.url,
        headless=not args.no_headless,
        user_agent=args.user_agent
    )
    
    try:
        # テスト実行
        stats = tester.run_test(
            num_requests=args.requests,
            num_threads=args.threads,
            delay=args.delay
        )
        
        # 結果をコンソールに出力
        print("\n" + "="*50)
        print("CLOUDFLARE BOT FIGHT MODE TEST RESULTS")
        print("="*50)
        print(f"Target URL: {stats['test_summary']['target_url']}")
        print(f"Total Time: {stats['test_summary']['total_time']:.2f}s")
        print(f"Total Requests: {stats['test_summary']['total_requests']}")
        print(f"Successful Requests: {stats['test_summary']['successful_requests']}")
        print(f"Failed Requests: {stats['test_summary']['failed_requests']}")
        print(f"Success Rate: {stats['test_summary']['success_rate']:.1f}%")
        print(f"Requests/Second: {stats['performance']['requests_per_second']:.2f}")
        print(f"Avg Response Time: {stats['performance']['avg_response_time']:.2f}s")
        print(f"Cloudflare Challenges: {stats['cloudflare_detection']['challenges_detected']}")
        print(f"Challenge Rate: {stats['cloudflare_detection']['challenge_rate']:.1f}%")
        print(f"Cloudflare Blocks: {stats['cloudflare_detection']['blocks']}")
        print(f"reCAPTCHA Found: {stats['recaptcha_info']['found_instances']}")
        
        if stats['bot_scores']['avg_score'] is not None:
            print(f"Avg Bot Score: {stats['bot_scores']['avg_score']:.3f}")
        
        print("="*50)
        
    except KeyboardInterrupt:
        logger.info("Test interrupted by user")
    except Exception as e:
        logger.error(f"Test failed: {e}")
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())