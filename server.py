import os
import time
import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import re
from html.parser import HTMLParser

PORT = 8000
HORSES_CACHE_DIR = os.path.join(os.path.dirname(__file__), 'cache', 'horses')
STATE_FILE = os.path.join(os.path.dirname(__file__), 'cache', 'state.json')

def get_horse_cache_path(horse_name):
    safe_name = re.sub(r'[\\/:*?"<>|]', '_', horse_name)
    return os.path.join(HORSES_CACHE_DIR, f'{safe_name}.json')

def load_horse_cache(horse_name):
    path = get_horse_cache_path(horse_name)
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return None
    return None

def save_horse_cache(horse_name, history):
    os.makedirs(HORSES_CACHE_DIR, exist_ok=True)
    path = get_horse_cache_path(horse_name)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.result = []
        self.skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip = True
        elif tag == 'img':
            attr_dict = dict(attrs)
            alt = attr_dict.get('alt', '').strip()
            if alt:
                self.result.append(alt + ' ')
        elif tag in ('br', 'p', 'div', 'tr', 'li', 'h1', 'h2', 'h3', 'h4'):
            self.result.append('\n')
        elif tag in ('td', 'th'):
            self.result.append('\t')

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip = False

    def handle_data(self, data):
        if not self.skip:
            text = data.strip()
            if text:
                self.result.append(text + ' ')

class UmaNoteHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/state':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode('utf-8'))
                os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
                with open(STATE_FILE, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                self.send_json(200, {'ok': True})
            except Exception as e:
                self.send_json(500, {'error': str(e)})
            return
        self.send_json(404, {'error': 'Not found'})

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/state':
            if os.path.exists(STATE_FILE):
                try:
                    with open(STATE_FILE, 'r', encoding='utf-8') as f:
                        self.send_json(200, json.load(f))
                        return
                except Exception:
                    pass
            self.send_json(200, {})
            return
        if parsed.path == '/api/horse_history':
            params = urllib.parse.parse_qs(parsed.query)
            horse_name = params.get('name', [''])[0].strip()
            target_url = params.get('url', [''])[0].strip()
            if not horse_name:
                self.send_json(400, {'error': '馬名が必要です'})
                return

            cached_history = load_horse_cache(horse_name)
            if cached_history and len(cached_history) > 0:
                print(f"[cache HIT] {horse_name} ({len(cached_history)} races)")
                self.send_json(200, {'cached': True, 'history': cached_history})
                return

            print(f"[cache MISS] {horse_name} -> fetching {target_url}")

            if not target_url.startswith('https://www.jra.go.jp/'):
                self.send_json(200, {'cached': False, 'history': []})
                return

            try:
                time.sleep(0.4)  # サーバー負荷軽減のためのウェイト
                req = urllib.request.Request(
                    target_url,
                    headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
                )
                with urllib.request.urlopen(req, timeout=10) as res:
                    raw_bytes = res.read()
                    html_text = raw_bytes.decode('cp932', errors='replace')

                extractor = TextExtractor()
                extractor.feed(html_text)
                plain_text = ''.join(extractor.result)
                plain_text = re.sub(r'\n\s*\n+', '\n', plain_text)

                # 馬ページのテキストから過去走を抽出（日付を含む行単位でパース）
                history = []
                for line in plain_text.split('\n'):
                    date_m = re.search(r'(\d{4})年(\d{1,2})月(\d{1,2})日', line)
                    if not date_m:
                        continue
                    cols = [c.strip() for c in line.split('\t') if c.strip()]
                    # 日付、競馬場、レース名、距離、馬場、着順などを柔軟に探す
                    dist_m = re.search(r'(芝|ダ)\s*(\d{4})|(\d{4})\s*(芝|ダ)', line)
                    if not dist_m:
                        continue  # 距離がない行（生年月日など）はスキップ
                    surface = (dist_m.group(1) or dist_m.group(4))
                    dist = int(dist_m.group(2) or dist_m.group(3))
                    cond_m = re.search(r'(良|稍重|重|不良)', line)
                    cond = cond_m.group(1) if cond_m else '良'
                    time_m = re.search(r'(\d:\d{2}\.\d)', line)
                    race_time = time_m.group(1) if time_m else ''
                    weight = f"{cols[10]}kg" if (len(cols) > 10 and re.fullmatch(r'\d{3}', cols[10])) else ''
                    pos = None
                    rank_m = re.search(r'(\d{1,2})\s*着', line)
                    if rank_m:
                        rank = int(rank_m.group(1))
                    elif len(cols) > 7 and re.fullmatch(r'\d{1,2}', cols[7]):
                        rank = int(cols[7])
                    else:
                        rank = '-'
                    race_title = cols[2] if len(cols) > 2 else (cols[1] if len(cols) > 1 else '-')
                    course_m = re.search(r'(札幌|函館|福島|新潟|東京|中山|中京|京都|阪神|小倉)', line)
                    course = course_m.group(1) if course_m else ''
                    history.append({
                        'date': f'{date_m.group(1)[2:]}/{date_m.group(2)}',
                        'course': course,
                        'raceTitle': race_title[:12],
                        'rank': rank,
                        'surface': surface,
                        'dist': dist,
                        'cond': cond,
                        'time': race_time,
                        'weight': weight,
                        'pos': pos
                    })

                print(f"  -> parsed {len(history)} races for {horse_name}")
                if len(history) > 0:
                    save_horse_cache(horse_name, history)
                self.send_json(200, {'cached': False, 'history': history})
            except Exception as e:
                self.send_json(500, {'error': str(e)})
            return

        if parsed.path == '/api/fetch':
            params = urllib.parse.parse_qs(parsed.query)
            target_url = params.get('url', [''])[0]
            if not target_url.startswith('https://www.jra.go.jp/'):
                self.send_json(400, {'error': 'JRAのURLを指定してください'})
                return

            try:
                req = urllib.request.Request(
                    target_url,
                    headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
                )
                with urllib.request.urlopen(req, timeout=10) as res:
                    raw_bytes = res.read()
                    # JRAはShift_JIS(cp932)の場合が多い
                    html_text = None
                    for enc in ('cp932', 'utf-8', 'euc_jp'):
                        try:
                            html_text = raw_bytes.decode(enc)
                            break
                        except UnicodeDecodeError:
                            continue
                    if html_text is None:
                        html_text = raw_bytes.decode('utf-8', errors='replace')

                extractor = TextExtractor()
                extractor.feed(html_text)
                plain_text = ''.join(extractor.result)
                # 連続する空行を整理
                plain_text = re.sub(r'\n\s*\n+', '\n', plain_text)

                # 馬個別ページへのリンクを抽出 (href形式・doAction形式の両方に対応)
                horse_links = {}
                # 1. href="/JRADB/accessU.html?CNAME=..." 形式
                for m in re.finditer(r'href=["\'](/JRADB/accessU\.html\?CNAME=[^"\']+)["\'][^>]*>(.*?)</a>', html_text, re.DOTALL):
                    url_path = m.group(1).strip()
                    h_name = re.sub(r'<[^>]+>', '', m.group(2)).strip()
                    if h_name:
                        horse_links[h_name] = f"https://www.jra.go.jp{url_path}"

                # 2. doAction('/JRADB/accessU.html', 'CNAME') 形式
                for m in re.finditer(r"doAction\(['\"]/JRADB/accessU\.html['\"],\s*['\"]([^'\"]+)['\"]\)[^>]*>(.*?)</a>", html_text, re.DOTALL):
                    cname = m.group(1).strip()
                    h_name = re.sub(r'<[^>]+>', '', m.group(2)).strip()
                    if h_name and cname:
                        horse_links[h_name] = f"https://www.jra.go.jp/JRADB/accessU.html?CNAME={cname}"

                print(f"[fetch] horse_links found: {len(horse_links)}")
                self.send_json(200, {'text': plain_text, 'horseLinks': horse_links})
            except Exception as e:
                self.send_json(500, {'error': str(e)})
            return

        super().do_GET()

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', PORT), UmaNoteHandler) as httpd:
        print(f'uma-note server running at http://localhost:{PORT}')
        httpd.serve_forever()
