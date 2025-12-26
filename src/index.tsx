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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="theme-color" content="#22c55e">
  <title>Thanks Garden - 社内感謝アプリ</title>
  <link rel="icon" type="image/png" href="/static/favicon.png">
  <link rel="apple-touch-icon" href="/static/favicon.png">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '#10B981',
            secondary: '#3B82F6'
          }
        }
      }
    }
  </script>
  <style>
    * { font-family: 'Nunito', sans-serif; -webkit-tap-highlight-color: transparent; }
    body { overscroll-behavior: none; }
    
    /* スクロールバー */
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: #f0fdf4; }
    ::-webkit-scrollbar-thumb { background: #86efac; border-radius: 10px; }
    
    /* アニメーション */
    @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
    .float-animation { animation: float 3s ease-in-out infinite; }
    
    @keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    .pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
    
    /* カード */
    .cute-card {
      background: linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%);
      border: 2px solid #86efac;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(134, 239, 172, 0.15);
    }
    
    /* ボタン */
    .cute-btn {
      background: linear-gradient(145deg, #4ade80, #22c55e);
      border: none;
      border-radius: 12px;
      color: white;
      font-weight: 700;
      padding: 12px 20px;
      box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .cute-btn:active { transform: scale(0.97); }
    
    /* タブ */
    .tab-btn {
      padding: 8px 12px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 12px;
      background: white;
      border: 2px solid #e5e7eb;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: linear-gradient(145deg, #4ade80, #22c55e);
      color: white;
      border-color: transparent;
    }
    
    /* ヘッダー */
    .header-gradient {
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%);
    }
    
    /* 入力フィールド */
    .cute-input, .cute-select {
      border: 2px solid #d1fae5;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 16px; /* iOSズーム防止 */
      background: white;
    }
    .cute-input:focus, .cute-select:focus {
      outline: none;
      border-color: #4ade80;
      box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.2);
    }
    
    /* ボトムナビ */
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
      border-top: 1px solid #e5e7eb;
      padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
      z-index: 50;
    }
    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 10px;
      color: #9ca3af;
      transition: color 0.2s;
    }
    .nav-item.active { color: #22c55e; }
    .nav-item i { font-size: 20px; margin-bottom: 2px; }
    
    /* コンテンツ余白 */
    .content-area { padding-bottom: calc(70px + env(safe-area-inset-bottom)); }
    
    /* ルーレットモーダル */
    .roulette-modal {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .roulette-content {
      background: white;
      border-radius: 20px;
      padding: 24px;
      text-align: center;
      max-width: 300px;
      width: 90%;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(720deg); }
    }
    .spin { animation: spin 2s cubic-bezier(0.17, 0.67, 0.12, 0.99); }
    
    @keyframes bounce-in {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    .bounce-in { animation: bounce-in 0.5s ease-out; }
  </style>
</head>
<body class="bg-gradient-to-br from-green-50 via-white to-emerald-50 min-h-screen">
  <div id="app">
    <!-- ログイン画面 -->
    <div id="loginScreen" class="min-h-screen flex items-center justify-center p-4">
      <div class="cute-card p-6 w-full max-w-sm text-center">
        <div class="text-5xl mb-3 float-animation">🌳</div>
        <h1 class="text-2xl font-bold text-green-700 mb-1">Thanks Garden</h1>
        <p class="text-green-600 text-sm mb-5">🌸 社内感謝アプリ 🌸</p>
        
        <div class="mb-4">
          <label class="block text-green-700 font-semibold mb-2 text-left text-sm">🏢 部署</label>
          <select id="departmentSelect" class="cute-select w-full">
            <option value="">部署を選んでください</option>
          </select>
        </div>
        
        <div class="mb-5">
          <label class="block text-green-700 font-semibold mb-2 text-left text-sm">👤 ユーザー</label>
          <select id="userSelect" class="cute-select w-full" disabled>
            <option value="">先に部署を選んでください</option>
          </select>
        </div>
        
        <button id="loginBtn" class="cute-btn w-full" disabled>
          🌱 ログイン
        </button>
      </div>
    </div>
    
    <!-- メイン画面 -->
    <div id="mainScreen" class="hidden">
      <!-- ヘッダー（モバイル最適化） -->
      <header class="header-gradient text-white p-3 shadow-lg sticky top-0 z-40">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🌳</span>
            <div>
              <h1 class="text-base font-bold leading-tight">Thanks Garden</h1>
              <p class="text-xs text-green-100 truncate max-w-[120px]" id="currentUserName">...</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="bg-white/20 rounded-full px-3 py-1.5 flex items-center gap-1">
              <span>🌱</span>
              <span id="seedCount" class="font-bold text-sm">3</span>
            </div>
            <div class="bg-white/20 rounded-full px-3 py-1.5 flex items-center gap-1">
              <span>⭐</span>
              <span id="totalPoints" class="font-bold text-sm">0</span>
            </div>
            <button id="logoutBtn" class="bg-white/20 rounded-full p-2">
              <i class="fas fa-sign-out-alt text-sm"></i>
            </button>
          </div>
        </div>
      </header>
      
      <!-- メインコンテンツ -->
      <main class="p-3 content-area">
        <!-- 感謝送信（コンパクト） -->
        <div class="cute-card p-4 mb-4">
          <h2 class="text-base font-bold text-green-700 mb-3 flex items-center gap-2">
            <span>💝</span> 感謝を送る
          </h2>
          <div class="space-y-3">
            <select id="receiverSelect" class="cute-select w-full text-sm">
              <option value="">送り先を選択...</option>
            </select>
            <textarea id="messageInput" class="cute-input w-full h-16 resize-none text-sm" placeholder="メッセージを入力..."></textarea>
            <button id="sendThanksBtn" class="cute-btn w-full text-sm">
              🌸 感謝を送る（種を1個使用）
            </button>
          </div>
        </div>
        
        <!-- マイツリー（コンパクト） -->
        <div class="cute-card p-4 mb-4">
          <div class="flex items-center gap-4">
            <div class="text-4xl" id="treeEmoji">🌱</div>
            <div class="flex-1">
              <div class="text-sm font-bold text-green-700" id="treeLevelText">Lv.1 芽</div>
              <div class="w-full bg-green-100 rounded-full h-2 mt-1 overflow-hidden">
                <div id="treeProgress" class="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full transition-all" style="width: 0%"></div>
              </div>
              <p class="text-xs text-green-600 mt-1" id="treeProgressText">次のレベルまで 100pt</p>
            </div>
          </div>
        </div>
        
        <!-- タブコンテンツ -->
        <div id="tabContent" class="cute-card p-4">
          <div id="companytreeTab">
            <h3 class="text-base font-bold text-green-700 mb-3">🌲 カンパニーツリー</h3>
            <div id="companyTreeDisplay">読み込み中...</div>
          </div>
          <div id="gardenTab" class="hidden">
            <h3 class="text-base font-bold text-green-700 mb-3">🏡 会社の庭</h3>
            <div id="gardenVisualization">読み込み中...</div>
          </div>
          <div id="timelineTab" class="hidden">
            <h3 class="text-base font-bold text-green-700 mb-3">📜 タイムライン</h3>
            <div id="timelineDisplay">読み込み中...</div>
          </div>
          <div id="rankingTab" class="hidden">
            <h3 class="text-base font-bold text-green-700 mb-3">🏆 ランキング</h3>
            <div id="rankingDisplay">読み込み中...</div>
          </div>
          <div id="monthlyTab" class="hidden">
            <h3 class="text-base font-bold text-green-700 mb-3">📊 月別レポート</h3>
            <select id="monthSelect" class="cute-select w-full mb-3 text-sm">
              <option value="">月を選択...</option>
            </select>
            <div id="monthlyDisplay">月を選択してください</div>
          </div>
        </div>
      </main>
      
      <!-- ボトムナビゲーション -->
      <nav class="bottom-nav">
        <div class="flex justify-around">
          <button class="nav-item active" data-tab="companytree">
            <i class="fas fa-tree"></i>
            <span>ツリー</span>
          </button>
          <button class="nav-item" data-tab="garden">
            <i class="fas fa-seedling"></i>
            <span>庭</span>
          </button>
          <button class="nav-item" data-tab="timeline">
            <i class="fas fa-stream"></i>
            <span>履歴</span>
          </button>
          <button class="nav-item" data-tab="ranking">
            <i class="fas fa-trophy"></i>
            <span>順位</span>
          </button>
          <button class="nav-item" data-tab="monthly">
            <i class="fas fa-chart-bar"></i>
            <span>月別</span>
          </button>
        </div>
      </nav>
    </div>
  </div>
  
  <!-- ルーレットモーダル -->
  <div id="rouletteModal" class="roulette-modal hidden">
    <div class="roulette-content">
      <div id="rouletteSpinner" class="text-6xl mb-4">🎰</div>
      <div id="rouletteResult" class="hidden">
        <div id="rouletteEmoji" class="text-5xl mb-2 bounce-in"></div>
        <div id="rouletteLabel" class="text-xl font-bold mb-2"></div>
        <div id="roulettePoints" class="text-2xl font-bold text-green-600"></div>
      </div>
      <p id="rouletteMessage" class="text-gray-600 text-sm mt-3"></p>
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="/static/garden.js?v=4"></script>
  <script src="/static/app.js?v=4"></script>
</body>
</html>`);
});

export default app;
