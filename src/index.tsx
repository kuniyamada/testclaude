import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';

// Routes
import usersRoute from './routes/users';
import thanksRoute from './routes/thanks';
import departmentsRoute from './routes/departments';
import rankingsRoute from './routes/rankings';
import companytreeRoute from './routes/companytree';
import monthlyRoute from './routes/monthly';
import gardenRoute from './routes/garden';
import adminRoute from './routes/admin';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS設定
app.use('/api/*', cors());

// 静的ファイル
app.use('/static/*', serveStatic({ root: './' }));

// APIルート
app.route('/api/users', usersRoute);
app.route('/api/thanks', thanksRoute);
app.route('/api/departments', departmentsRoute);
app.route('/api/rankings', rankingsRoute);
app.route('/api/companytree', companytreeRoute);
app.route('/api/monthly', monthlyRoute);
app.route('/api/garden', gardenRoute);
app.route('/api/admin', adminRoute);

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', app: 'Thanks Garden' });
});

// メインページ
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thanks Garden - 社内感謝アプリ</title>
  <link rel="icon" type="image/png" href="/static/favicon.png">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '#10B981',
            secondary: '#3B82F6',
            cute: {
              pink: '#FFB6C1',
              mint: '#98FB98',
              lavender: '#E6E6FA',
              peach: '#FFDAB9',
              sky: '#87CEEB',
              cream: '#FFFDD0'
            }
          },
          fontFamily: {
            cute: ['Nunito', 'sans-serif']
          }
        }
      }
    }
  </script>
  <style>
    * { font-family: 'Nunito', sans-serif; }
    
    /* かわいいスクロールバー */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #f0fdf4; border-radius: 10px; }
    ::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #86efac, #4ade80); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #4ade80, #22c55e); }
    
    /* ふわふわアニメーション */
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    .float-animation { animation: float 3s ease-in-out infinite; }
    
    /* バウンスアニメーション */
    @keyframes bounce-soft {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    .bounce-soft { animation: bounce-soft 2s ease-in-out infinite; }
    
    /* きらきらアニメーション */
    @keyframes sparkle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .sparkle { animation: sparkle 1.5s ease-in-out infinite; }
    
    /* かわいいカード */
    .cute-card {
      background: linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%);
      border: 2px solid #86efac;
      border-radius: 20px;
      box-shadow: 0 4px 15px rgba(134, 239, 172, 0.2);
      transition: all 0.3s ease;
    }
    .cute-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(134, 239, 172, 0.3);
    }
    
    /* かわいいボタン */
    .cute-btn {
      background: linear-gradient(145deg, #4ade80, #22c55e);
      border: none;
      border-radius: 15px;
      color: white;
      font-weight: 700;
      padding: 12px 24px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(74, 222, 128, 0.3);
    }
    .cute-btn:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 6px 20px rgba(74, 222, 128, 0.4);
    }
    .cute-btn:active {
      transform: translateY(0) scale(0.98);
    }
    
    /* タブスタイル */
    .tab-btn {
      padding: 10px 16px;
      border-radius: 12px;
      font-weight: 600;
      transition: all 0.3s ease;
      background: white;
      border: 2px solid #e5e7eb;
    }
    .tab-btn:hover {
      background: #f0fdf4;
      border-color: #86efac;
    }
    .tab-btn.active {
      background: linear-gradient(145deg, #4ade80, #22c55e);
      color: white;
      border-color: transparent;
    }
    
    /* ヘッダーグラデーション */
    .header-gradient {
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%);
    }
    
    /* 入力フィールド */
    .cute-input {
      border: 2px solid #d1fae5;
      border-radius: 12px;
      padding: 12px 16px;
      transition: all 0.3s ease;
    }
    .cute-input:focus {
      outline: none;
      border-color: #4ade80;
      box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.2);
    }
    
    /* 選択ボックス */
    .cute-select {
      border: 2px solid #d1fae5;
      border-radius: 12px;
      padding: 12px 16px;
      background: white;
      transition: all 0.3s ease;
    }
    .cute-select:focus {
      outline: none;
      border-color: #4ade80;
      box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.2);
    }
  </style>
</head>
<body class="bg-gradient-to-br from-green-50 via-white to-emerald-50 min-h-screen">
  <div id="app">
    <!-- ログイン画面 -->
    <div id="loginScreen" class="min-h-screen flex items-center justify-center p-4">
      <div class="cute-card p-8 w-full max-w-md text-center">
        <div class="text-6xl mb-4 float-animation">🌳</div>
        <h1 class="text-3xl font-bold text-green-700 mb-2">Thanks Garden</h1>
        <p class="text-green-600 mb-6">🌸 社内感謝アプリ 🌸</p>
        
        <div class="mb-6">
          <label class="block text-green-700 font-semibold mb-2 text-left">
            🏢 部署を選択
          </label>
          <select id="departmentSelect" class="cute-select w-full">
            <option value="">部署を選んでください</option>
          </select>
        </div>
        
        <div class="mb-6">
          <label class="block text-green-700 font-semibold mb-2 text-left">
            👤 ユーザーを選択
          </label>
          <select id="userSelect" class="cute-select w-full" disabled>
            <option value="">先に部署を選んでください</option>
          </select>
        </div>
        
        <button id="loginBtn" class="cute-btn w-full text-lg" disabled>
          🌱 ログイン
        </button>
        
        <div class="mt-6 text-sm text-green-600">
          ✨ 感謝の気持ちで庭を育てよう ✨
        </div>
      </div>
    </div>
    
    <!-- メイン画面 -->
    <div id="mainScreen" class="hidden">
      <!-- ヘッダー -->
      <header class="header-gradient text-white p-4 shadow-lg">
        <div class="max-w-6xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-3xl">🌳</span>
            <div>
              <h1 class="text-xl font-bold">Thanks Garden</h1>
              <p class="text-sm text-green-100" id="currentUserName">ログイン中...</p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="bg-white/20 rounded-full px-4 py-2 flex items-center gap-2">
              <span class="text-xl">🌱</span>
              <span id="seedCount" class="font-bold">3</span>
              <span class="text-sm">個</span>
            </div>
            <div class="bg-white/20 rounded-full px-4 py-2 flex items-center gap-2">
              <span class="text-xl">⭐</span>
              <span id="totalPoints" class="font-bold">0</span>
              <span class="text-sm">pt</span>
            </div>
            <button id="logoutBtn" class="bg-white/20 hover:bg-white/30 rounded-full px-4 py-2 transition">
              🚪 ログアウト
            </button>
          </div>
        </div>
      </header>
      
      <!-- メインコンテンツ -->
      <main class="max-w-6xl mx-auto p-4">
        <!-- 上部パネル：マイツリーと感謝送信 -->
        <div class="grid md:grid-cols-2 gap-4 mb-6">
          <!-- マイツリー -->
          <div class="cute-card p-6">
            <h2 class="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
              <span class="text-2xl">🌳</span> マイツリー
            </h2>
            <div id="myTreeDisplay" class="text-center">
              <div class="text-6xl mb-2" id="treeEmoji">🌱</div>
              <div class="text-lg font-bold text-green-700" id="treeLevelText">Lv.1 芽</div>
              <div class="w-full bg-green-100 rounded-full h-4 mt-4 overflow-hidden">
                <div id="treeProgress" class="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full transition-all duration-500" style="width: 0%"></div>
              </div>
              <p class="text-sm text-green-600 mt-2" id="treeProgressText">次のレベルまで 100pt</p>
            </div>
          </div>
          
          <!-- 感謝送信 -->
          <div class="cute-card p-6">
            <h2 class="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
              <span class="text-2xl">💝</span> 感謝を送る
            </h2>
            <div class="space-y-4">
              <div>
                <label class="block text-green-700 font-semibold mb-2">送り先</label>
                <select id="receiverSelect" class="cute-select w-full">
                  <option value="">選択してください</option>
                </select>
              </div>
              <div>
                <label class="block text-green-700 font-semibold mb-2">メッセージ</label>
                <textarea id="messageInput" class="cute-input w-full h-24 resize-none" placeholder="感謝のメッセージを入力..."></textarea>
              </div>
              <button id="sendThanksBtn" class="cute-btn w-full">
                🌸 感謝を送る（種を1個使用）
              </button>
            </div>
          </div>
        </div>
        
        <!-- タブナビゲーション -->
        <div class="flex flex-wrap gap-2 mb-4">
          <button class="tab-btn active" data-tab="companytree">🌲 カンパニーツリー</button>
          <button class="tab-btn" data-tab="garden">🏡 会社の庭</button>
          <button class="tab-btn" data-tab="timeline">📜 タイムライン</button>
          <button class="tab-btn" data-tab="ranking">🏆 ランキング</button>
          <button class="tab-btn" data-tab="monthly">📊 月別レポート</button>
        </div>
        
        <!-- タブコンテンツ -->
        <div id="tabContent" class="cute-card p-6">
          <div id="companytreeTab">
            <h3 class="text-xl font-bold text-green-700 mb-4">🌲 カンパニーツリー</h3>
            <div id="companyTreeDisplay">読み込み中...</div>
          </div>
          <div id="gardenTab" class="hidden">
            <h3 class="text-xl font-bold text-green-700 mb-4">🏡 会社の庭</h3>
            <div id="gardenVisualization">
              <div class="text-center py-8">
                <div class="text-4xl mb-4">🌱</div>
                <p class="text-green-600">庭を読み込み中...</p>
              </div>
            </div>
          </div>
          <div id="timelineTab" class="hidden">
            <h3 class="text-xl font-bold text-green-700 mb-4">📜 タイムライン</h3>
            <div id="timelineDisplay">読み込み中...</div>
          </div>
          <div id="rankingTab" class="hidden">
            <h3 class="text-xl font-bold text-green-700 mb-4">🏆 ランキング</h3>
            <div id="rankingDisplay">読み込み中...</div>
          </div>
          <div id="monthlyTab" class="hidden">
            <h3 class="text-xl font-bold text-green-700 mb-4">📊 月別レポート</h3>
            <div class="mb-4">
              <select id="monthSelect" class="cute-select">
                <option value="">月を選択...</option>
              </select>
            </div>
            <div id="monthlyDisplay">月を選択してください</div>
          </div>
        </div>
      </main>
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="/static/garden.js?v=3"></script>
  <script src="/static/app.js?v=3"></script>
</body>
</html>`);
});

export default app;
