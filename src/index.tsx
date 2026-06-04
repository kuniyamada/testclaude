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
  <meta name="apple-mobile-web-app-title" content="Thanks Garden">
  <meta name="theme-color" content="#22c55e">
  <meta name="description" content="社内感謝アプリ - みんなの感謝で庭を育てよう">
  <meta name="mobile-web-app-capable" content="yes">
  <title>Thanks Garden - 社内感謝アプリ</title>
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/static/favicon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/static/favicon.png">
  
  <!-- Apple Touch Icons (iOS) -->
  <link rel="apple-touch-icon" href="/static/apple-touch-icon.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/static/apple-touch-icon.png">
  <link rel="apple-touch-icon" sizes="192x192" href="/static/app-icon-192.png">
  
  <!-- PWA Manifest -->
  <link rel="manifest" href="/static/manifest.json">
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

    /* 主役カード（感謝を送る） */
    .hero-card {
      background: linear-gradient(135deg, #34d399 0%, #22c55e 55%, #16a34a 100%);
      border: none;
      border-radius: 20px;
      box-shadow: 0 10px 28px rgba(16, 185, 129, 0.4);
      position: relative;
      overflow: hidden;
    }
    .hero-card::before {
      content: '';
      position: absolute;
      top: -40px;
      right: -30px;
      width: 120px;
      height: 120px;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 50%;
    }
    .hero-card .hero-field {
      border: none;
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 16px; /* iOSズーム防止 */
      background: rgba(255, 255, 255, 0.97);
      width: 100%;
    }
    .hero-card .hero-field:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.6);
    }
    .hero-btn {
      background: white;
      color: #16a34a;
      border: none;
      border-radius: 14px;
      font-weight: 800;
      font-size: 15px;
      padding: 14px 20px;
      width: 100%;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .hero-btn:active { transform: scale(0.97); }
    
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
        
        <button id="helpBtnLogin" class="mt-3 text-green-600 text-sm underline hover:text-green-700">
          📖 ルールを見る
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
            <button id="helpBtn" class="bg-white/20 rounded-full p-2" title="ルール説明">
              <i class="fas fa-question-circle text-sm"></i>
            </button>
            <button id="logoutBtn" class="bg-white/20 rounded-full p-2">
              <i class="fas fa-sign-out-alt text-sm"></i>
            </button>
          </div>
        </div>
      </header>
      
      <!-- メインコンテンツ -->
      <main class="p-3 content-area">
        <!-- 感謝送信（主役カード） -->
        <div class="hero-card p-5 mb-4">
          <h2 class="text-lg font-extrabold text-white mb-1 flex items-center gap-2 relative">
            <span class="text-2xl">💝</span> 感謝を送ろう
          </h2>
          <p class="text-green-50 text-xs mb-4 relative">今日のありがとうを届けよう 🌸</p>
          <div class="space-y-3 relative">
            <select id="receiverSelect" class="hero-field">
              <option value="">送り先を選択...</option>
            </select>
            <textarea id="messageInput" class="hero-field h-16 resize-none" placeholder="メッセージを入力..."></textarea>
            <button id="sendThanksBtn" class="hero-btn">
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
  
  <!-- ヘルプモーダル（ルール説明） -->
  <div id="helpModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 hidden p-4">
    <div class="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl">
      <!-- ヘッダー -->
      <div class="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-t-2xl sticky top-0">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold flex items-center gap-2">
            <span>📖</span> ルール説明
          </h2>
          <button id="closeHelpBtn" class="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center hover:bg-white/30">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <!-- コンテンツ -->
      <div class="p-4 space-y-4">
        <!-- 基本ルール -->
        <div class="bg-green-50 rounded-xl p-4 border-2 border-green-200">
          <h3 class="font-bold text-green-700 mb-2 flex items-center gap-2">
            <span>🌱</span> 種（シード）について
          </h3>
          <ul class="text-sm text-green-800 space-y-1">
            <li>• 毎日 <b>3個</b> の種がもらえます</li>
            <li>• 感謝を送ると種を <b>1個消費</b> します</li>
            <li>• 毎朝（日本時間0時）にリセットされます</li>
            <li>• 使い切っても翌日には復活！</li>
          </ul>
        </div>
        
        <!-- 72時間ルール -->
        <div class="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
          <h3 class="font-bold text-blue-700 mb-2 flex items-center gap-2">
            <span>⏰</span> 72時間クールダウン
          </h3>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• 同じ人には <b>72時間（3日間）</b> 空けないと送れません</li>
            <li>• いろんな人に感謝を送りましょう！</li>
            <li>• 別の人には続けて送れます</li>
          </ul>
        </div>
        
        <!-- ポイントルール -->
        <div class="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
          <h3 class="font-bold text-yellow-700 mb-2 flex items-center gap-2">
            <span>⭐</span> ポイントについて
          </h3>
          <ul class="text-sm text-yellow-800 space-y-1">
            <li>• 同じ部署への感謝: <b>10ポイント</b></li>
            <li>• 他部署への感謝: <b>15ポイント</b> 🌉</li>
            <li>• 送った人・もらった人の両方にポイント付与！</li>
          </ul>
        </div>
        
        <!-- ルーレットボーナス -->
        <div class="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
          <h3 class="font-bold text-purple-700 mb-2 flex items-center gap-2">
            <span>🎰</span> ボーナスルーレット
          </h3>
          <p class="text-sm text-purple-800 mb-2">感謝を送ると自動でルーレットが回ります！</p>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="bg-white rounded-lg p-2 text-center border border-purple-200">
              <div class="text-lg">💚</div>
              <div class="font-bold">1x</div>
              <div class="text-xs text-gray-500">40%</div>
            </div>
            <div class="bg-white rounded-lg p-2 text-center border border-purple-200">
              <div class="text-lg">🍀</div>
              <div class="font-bold text-teal-600">1.5x</div>
              <div class="text-xs text-gray-500">30%</div>
            </div>
            <div class="bg-white rounded-lg p-2 text-center border border-purple-200">
              <div class="text-lg">✨</div>
              <div class="font-bold text-cyan-600">2x</div>
              <div class="text-xs text-gray-500">20%</div>
            </div>
            <div class="bg-white rounded-lg p-2 text-center border border-purple-200">
              <div class="text-lg">🌟</div>
              <div class="font-bold text-red-500">3x</div>
              <div class="text-xs text-gray-500">8%</div>
            </div>
            <div class="col-span-2 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg p-2 text-center border-2 border-yellow-300">
              <div class="text-2xl">🎰</div>
              <div class="font-bold text-yellow-600">5x JACKPOT!</div>
              <div class="text-xs text-gray-500">2%</div>
            </div>
          </div>
        </div>
        
        <!-- マイツリー -->
        <div class="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
          <h3 class="font-bold text-emerald-700 mb-2 flex items-center gap-2">
            <span>🌳</span> マイツリーの成長
          </h3>
          <p class="text-sm text-emerald-800 mb-2">累計ポイントでツリーが成長します！</p>
          <div class="grid grid-cols-3 gap-2 text-center text-sm">
            <div class="bg-white rounded-lg p-2 border border-emerald-200">
              <div>🌱</div>
              <div class="text-xs">Lv.1</div>
              <div class="text-xs text-gray-500">0pt〜</div>
            </div>
            <div class="bg-white rounded-lg p-2 border border-emerald-200">
              <div>🌿</div>
              <div class="text-xs">Lv.2</div>
              <div class="text-xs text-gray-500">100pt〜</div>
            </div>
            <div class="bg-white rounded-lg p-2 border border-emerald-200">
              <div>🪴</div>
              <div class="text-xs">Lv.3</div>
              <div class="text-xs text-gray-500">300pt〜</div>
            </div>
            <div class="bg-white rounded-lg p-2 border border-emerald-200">
              <div>🌳</div>
              <div class="text-xs">Lv.4</div>
              <div class="text-xs text-gray-500">600pt〜</div>
            </div>
            <div class="bg-white rounded-lg p-2 border border-emerald-200">
              <div>🎄</div>
              <div class="text-xs">Lv.5</div>
              <div class="text-xs text-gray-500">1000pt〜</div>
            </div>
            <div class="bg-white rounded-lg p-2 border border-emerald-200">
              <div>🏆</div>
              <div class="text-xs">Lv.6</div>
              <div class="text-xs text-gray-500">1500pt〜</div>
            </div>
          </div>
        </div>
        
        <!-- 会社の庭 -->
        <div class="bg-pink-50 rounded-xl p-4 border-2 border-pink-200">
          <h3 class="font-bold text-pink-700 mb-2 flex items-center gap-2">
            <span>🏡</span> 会社の庭
          </h3>
          <p class="text-sm text-pink-800 mb-2">みんなの感謝で庭が育ちます！</p>
          <div class="grid grid-cols-3 gap-2 text-center text-sm">
            <div class="bg-white rounded-lg p-2 border border-pink-200">
              <div>🌱</div>
              <div class="text-xs">Stage1</div>
              <div class="text-xs text-gray-500">0回〜</div>
            </div>
            <div class="bg-white rounded-lg p-2 border border-pink-200">
              <div>🍄</div>
              <div class="text-xs">Stage2</div>
              <div class="text-xs text-gray-500">10回〜</div>
            </div>
            <div class="bg-white rounded-lg p-2 border border-pink-200">
              <div>🌸</div>
              <div class="text-xs">Stage3</div>
              <div class="text-xs text-gray-500">30回〜</div>
            </div>
            <div class="bg-white rounded-lg p-2 border border-pink-200">
              <div>✨</div>
              <div class="text-xs">Stage4</div>
              <div class="text-xs text-gray-500">60回〜</div>
            </div>
            <div class="bg-white rounded-lg p-2 border border-pink-200">
              <div>🦋</div>
              <div class="text-xs">Stage5</div>
              <div class="text-xs text-gray-500">100回〜</div>
            </div>
            <div class="bg-white rounded-lg p-2 border border-pink-200">
              <div>🎊</div>
              <div class="text-xs">Stage6</div>
              <div class="text-xs text-gray-500">150回〜</div>
            </div>
          </div>
          <p class="text-xs text-pink-600 mt-2 text-center">※ 毎月リセットされます</p>
        </div>
        
        <!-- 管理者向けリンク -->
        <div class="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
          <h3 class="font-bold text-gray-700 mb-2 flex items-center gap-2">
            <span>⚙️</span> その他
          </h3>
          <p class="text-sm text-gray-600 mb-2">
            管理者の方は<a href="/static/admin.html" class="text-blue-600 underline font-semibold">管理画面</a>からユーザー・部署の管理ができます。
          </p>
        </div>
      </div>
      
      <!-- フッター -->
      <div class="p-4 border-t">
        <button id="closeHelpBtn2" class="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 rounded-xl">
          わかった！🌟
        </button>
      </div>
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
