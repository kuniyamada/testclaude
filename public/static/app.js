// Thanks Garden - フロントエンドアプリケーション

// グローバル状態
let currentUser = null;
let users = [];
let departments = [];
let currentView = 'companytree';

// 日本時間で現在の年月を取得
function getCurrentYearMonth() {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(now.getTime() + jstOffset);
  const year = jstDate.getUTCFullYear();
  const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🌱 Thanks Garden 初期化開始...');
  try {
    console.log('📂 部署データ読み込み中...');
    await loadDepartments();
    console.log('👥 ユーザーデータ読み込み中...');
    await loadUsers();
    console.log('🎯 イベントリスナー設定中...');
    setupEventListeners();
    console.log('✅ 初期化完了！');
  } catch (error) {
    console.error('❌ 初期化エラー:', error);
  }
});

// 部署読み込み
async function loadDepartments() {
  try {
    const response = await axios.get('/api/departments');
    departments = response.data.departments || [];
    console.log(`📂 部署データ: ${departments.length}件`);
    
    const select = document.getElementById('departmentSelect');
    if (!select) {
      console.error('❌ departmentSelect要素が見つかりません');
      return;
    }
    select.innerHTML = '<option value="">部署を選んでください</option>';
    departments.forEach(dept => {
      select.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
    });
    console.log(`✅ 部署選択肢を設定しました`);
  } catch (error) {
    console.error('❌ 部署読み込みエラー:', error);
  }
}

// ユーザー読み込み
async function loadUsers() {
  try {
    const response = await axios.get('/api/users');
    users = response.data.users;
  } catch (error) {
    console.error('ユーザー読み込みエラー:', error);
  }
}

// イベントリスナー設定
function setupEventListeners() {
  // ヘルプボタン
  const helpBtn = document.getElementById('helpBtn');
  const helpModal = document.getElementById('helpModal');
  const closeHelpBtn = document.getElementById('closeHelpBtn');
  const closeHelpBtn2 = document.getElementById('closeHelpBtn2');
  
  if (helpModal) {
    // ヘッダーのヘルプボタン
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        helpModal.classList.remove('hidden');
      });
    }
    
    // ログイン画面のヘルプボタン
    const helpBtnLogin = document.getElementById('helpBtnLogin');
    if (helpBtnLogin) {
      helpBtnLogin.addEventListener('click', () => {
        helpModal.classList.remove('hidden');
      });
    }
    
    closeHelpBtn?.addEventListener('click', () => {
      helpModal.classList.add('hidden');
    });
    
    closeHelpBtn2?.addEventListener('click', () => {
      helpModal.classList.add('hidden');
    });
    
    // 背景クリックで閉じる
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) {
        helpModal.classList.add('hidden');
      }
    });
  }
  
  // 部署選択
  document.getElementById('departmentSelect').addEventListener('change', (e) => {
    const deptId = e.target.value;
    const userSelect = document.getElementById('userSelect');
    
    if (deptId) {
      const deptUsers = users.filter(u => u.department_id == deptId);
      userSelect.innerHTML = '<option value="">ユーザーを選んでください</option>';
      deptUsers.forEach(user => {
        userSelect.innerHTML += `<option value="${user.id}">${user.name}</option>`;
      });
      userSelect.disabled = false;
    } else {
      userSelect.innerHTML = '<option value="">先に部署を選んでください</option>';
      userSelect.disabled = true;
    }
    document.getElementById('loginBtn').disabled = true;
  });
  
  // ユーザー選択
  document.getElementById('userSelect').addEventListener('change', (e) => {
    document.getElementById('loginBtn').disabled = !e.target.value;
  });
  
  // ログインボタン
  document.getElementById('loginBtn').addEventListener('click', login);
  
  // ログアウトボタン
  document.getElementById('logoutBtn').addEventListener('click', logout);
  
  // 感謝送信ボタン
  document.getElementById('sendThanksBtn').addEventListener('click', sendThanks);
  
  // タブ切り替え（デスクトップ）
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
  });
  
  // ボトムナビ（モバイル）
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.tab;
      if (tab) switchTab(tab);
    });
  });
  
  // 月選択
  document.getElementById('monthSelect').addEventListener('change', (e) => {
    if (e.target.value) {
      loadMonthlyReport(e.target.value);
    }
  });
}

// ログイン処理
async function login() {
  const userId = document.getElementById('userSelect').value;
  if (!userId) return;
  
  try {
    const response = await axios.get(`/api/users/${userId}`);
    currentUser = response.data.user;
    
    // 日次シードリセット
    await axios.post(`/api/users/${userId}/reset-seeds`);
    const updatedResponse = await axios.get(`/api/users/${userId}`);
    currentUser = updatedResponse.data.user;
    
    showMainScreen();
  } catch (error) {
    console.error('ログインエラー:', error);
    alert('ログインに失敗しました');
  }
}

// ログアウト処理
function logout() {
  currentUser = null;
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('mainScreen').classList.add('hidden');
}

// メイン画面表示
async function showMainScreen() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('mainScreen').classList.remove('hidden');
  
  // ユーザー情報表示
  const dept = departments.find(d => d.id == currentUser.department_id);
  document.getElementById('currentUserName').textContent = `${currentUser.name}（${dept?.name || ''}）`;
  document.getElementById('seedCount').textContent = currentUser.daily_seeds;
  const totalPoints = Math.round((currentUser.total_received_points || 0) + (currentUser.total_sent_points || 0));
  document.getElementById('totalPoints').textContent = totalPoints;
  currentUser.total_points = totalPoints; // 互換性のため
  
  // マイツリー表示
  updateMyTree();
  
  // 送り先選択肢を設定
  setupReceiverSelect();
  
  // 初期タブ読み込み
  await loadCompanyTree();
  
  // 月リスト読み込み
  await loadMonthList();
}

// マイツリー更新
function updateMyTree() {
  const level = currentUser.tree_level || 1;
  const points = currentUser.total_points || 0;
  
  const levelConfig = {
    1: { emoji: '🌱', name: '芽', next: 100 },
    2: { emoji: '🌿', name: '若葉', next: 300 },
    3: { emoji: '🪴', name: '苗木', next: 600 },
    4: { emoji: '🌳', name: '木', next: 1000 },
    5: { emoji: '🎄', name: '大木', next: 1500 },
    6: { emoji: '🏆', name: '神木', next: null }
  };
  
  const config = levelConfig[level] || levelConfig[1];
  const prevPoints = level > 1 ? levelConfig[level - 1]?.next || 0 : 0;
  const progress = config.next ? Math.min(100, ((points - prevPoints) / (config.next - prevPoints)) * 100) : 100;
  
  document.getElementById('treeEmoji').textContent = config.emoji;
  document.getElementById('treeLevelText').textContent = `Lv.${level} ${config.name}`;
  document.getElementById('treeProgress').style.width = `${progress}%`;
  document.getElementById('treeProgressText').textContent = config.next 
    ? `次のレベルまで ${config.next - points}pt`
    : '🎉 最高レベル達成！';
}

// 送り先選択設定
function setupReceiverSelect() {
  const select = document.getElementById('receiverSelect');
  select.innerHTML = '<option value="">選択してください</option>';
  
  // 部署ごとにグループ化
  departments.forEach(dept => {
    const deptUsers = users.filter(u => u.department_id == dept.id && u.id != currentUser.id);
    if (deptUsers.length > 0) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = dept.name;
      deptUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        optgroup.appendChild(option);
      });
      select.appendChild(optgroup);
    }
  });
}

// ========================================
// 🎰 ルーレットモーダル（超派手なエフェクト版）
// ========================================

// ルーレットモーダルを表示
function showRouletteModal(result, callback) {
  const multiplier = result.roulette.multiplier;
  const isJackpot = multiplier >= 3;
  const isBig = multiplier >= 2;
  const isBonus = multiplier >= 1.5;
  
  // 結果に応じたメッセージ（大きく表示）
  const celebrationConfig = {
    1: { 
      title: '感謝を届けました！',
      subtitle: 'ありがとう💚',
      bgColor: 'linear-gradient(135deg, #4ade80, #22c55e)',
      textColor: '#166534'
    },
    1.5: { 
      title: '🍀 ラッキー！',
      subtitle: '1.5倍ボーナス！',
      bgColor: 'linear-gradient(135deg, #95E1D3, #4ECDC4)',
      textColor: '#047857'
    },
    2: { 
      title: '✨ ダブル！',
      subtitle: '2倍ボーナス！',
      bgColor: 'linear-gradient(135deg, #4ECDC4, #22c55e)',
      textColor: '#047857'
    },
    3: { 
      title: '🌟 SUPER!',
      subtitle: 'トリプルボーナス！！',
      bgColor: 'linear-gradient(135deg, #FF6B6B, #ff8787)',
      textColor: '#dc2626'
    },
    5: { 
      title: '🎰 JACKPOT!!',
      subtitle: '伝説の5倍ボーナス！！！',
      bgColor: 'linear-gradient(135deg, #FFD700, #FFA500, #FFD700)',
      textColor: '#d97706'
    }
  };
  
  const config = celebrationConfig[multiplier] || celebrationConfig[1];
  
  // モーダルを作成
  const modal = document.createElement('div');
  modal.id = 'rouletteModalContainer';
  
  const spinRotation = 1440 + Math.random() * 720;
  
  modal.innerHTML = `
    <style>
      @keyframes roulette-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes roulette-pop-in { 
        0% { transform: scale(0.3) rotate(-30deg); opacity: 0; }
        60% { transform: scale(1.15) rotate(5deg); }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }
      @keyframes roulette-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(${spinRotation}deg); }
      }
      @keyframes roulette-bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
      }
      @keyframes roulette-shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-8px) rotate(-3deg); }
        75% { transform: translateX(8px) rotate(3deg); }
      }
      @keyframes mega-shake {
        0%, 100% { transform: translateX(0) rotate(0deg); }
        10% { transform: translateX(-15px) rotate(-5deg); }
        20% { transform: translateX(15px) rotate(5deg); }
        30% { transform: translateX(-15px) rotate(-5deg); }
        40% { transform: translateX(15px) rotate(5deg); }
        50% { transform: translateX(-10px) rotate(-3deg); }
        60% { transform: translateX(10px) rotate(3deg); }
        70% { transform: translateX(-5px) rotate(-1deg); }
        80% { transform: translateX(5px) rotate(1deg); }
        90% { transform: translateX(-2px); }
      }
      @keyframes roulette-glow {
        0%, 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.6); }
        50% { box-shadow: 0 0 60px rgba(255, 215, 0, 1), 0 0 100px rgba(255, 165, 0, 0.6); }
      }
      @keyframes confetti-fall {
        0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(1080deg); opacity: 0; }
      }
      @keyframes float-up {
        0% { transform: translateY(0) scale(1); opacity: 1; }
        100% { transform: translateY(-150px) scale(2); opacity: 0; }
      }
      @keyframes rainbow-bg {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes pulse-ring {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
      }
      @keyframes title-slam {
        0% { transform: scale(0) translateY(-100px); opacity: 0; }
        50% { transform: scale(1.5) translateY(0); }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes subtitle-slide {
        0% { transform: translateY(50px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes points-explode {
        0% { transform: scale(0); opacity: 0; }
        50% { transform: scale(1.8); }
        70% { transform: scale(0.85); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes star-burst {
        0% { transform: scale(0) rotate(0deg); opacity: 1; }
        100% { transform: scale(3) rotate(180deg); opacity: 0; }
      }
      @keyframes sparkle {
        0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
        50% { opacity: 1; transform: scale(1) rotate(180deg); }
      }
      @keyframes screen-flash {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
      }
      .confetti {
        position: absolute;
        animation: confetti-fall 4s linear forwards;
      }
      .floating-emoji {
        position: absolute;
        animation: float-up 2s ease-out forwards;
        pointer-events: none;
      }
      .sparkle-star {
        position: absolute;
        font-size: 24px;
        animation: sparkle 1.5s ease-in-out infinite;
        pointer-events: none;
      }
    </style>
    
    <div id="rouletteOverlay" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: roulette-fade-in 0.3s ease;
      overflow: hidden;
    ">
      <!-- 画面フラッシュ（結果時） -->
      <div id="screenFlash" style="
        position: absolute;
        inset: 0;
        background: ${isJackpot ? '#FFD700' : isBig ? '#4ECDC4' : '#4ade80'};
        opacity: 0;
        pointer-events: none;
      "></div>
      
      <!-- 紙吹雪コンテナ -->
      <div id="confettiContainer" style="position: absolute; inset: 0; pointer-events: none;"></div>
      
      <!-- フローティング絵文字コンテナ -->
      <div id="floatingContainer" style="position: absolute; inset: 0; pointer-events: none;"></div>
      
      <!-- スパークルコンテナ -->
      <div id="sparkleContainer" style="position: absolute; inset: 0; pointer-events: none;"></div>
      
      <div id="rouletteCard" style="
        background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
        border-radius: 28px;
        padding: 28px;
        max-width: 380px;
        width: 92%;
        text-align: center;
        box-shadow: 0 25px 80px rgba(0,0,0,0.4);
        animation: roulette-pop-in 0.5s ease;
        position: relative;
      ">
        <!-- スピン中の表示 -->
        <div id="spinningPhase">
          <h2 style="font-size: 24px; color: #166534; margin-bottom: 16px; animation: roulette-shake 0.4s infinite;">
            🎰 ボーナスルーレット！
          </h2>
          
          <div id="rouletteWheel" style="
            width: 200px;
            height: 200px;
            margin: 20px auto;
            border-radius: 50%;
            background: conic-gradient(
              #A5D6A7 0deg 144deg,
              #95E1D3 144deg 252deg,
              #4ECDC4 252deg 324deg,
              #FF6B6B 324deg 352.8deg,
              #FFD700 352.8deg 360deg
            );
            position: relative;
            animation: roulette-spin 2.8s cubic-bezier(0.15, 0.85, 0.25, 1) forwards;
            box-shadow: 0 0 40px rgba(0,0,0,0.3), inset 0 0 50px rgba(255,255,255,0.4);
            border: 5px solid #22c55e;
          ">
            <!-- ルーレットのテキスト -->
            <div style="position: absolute; top: 20%; left: 50%; transform: translateX(-50%) rotate(72deg); color: white; font-weight: bold; font-size: 14px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">1x</div>
            <div style="position: absolute; top: 50%; right: 15%; transform: translateY(-50%) rotate(162deg); color: white; font-weight: bold; font-size: 14px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">1.5x</div>
            <div style="position: absolute; bottom: 25%; right: 25%; transform: rotate(252deg); color: white; font-weight: bold; font-size: 14px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">2x</div>
            <div style="position: absolute; bottom: 20%; left: 20%; transform: rotate(330deg); color: white; font-weight: bold; font-size: 12px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">3x</div>
            <div style="position: absolute; top: 25%; left: 15%; transform: rotate(356deg); color: #8B4513; font-weight: bold; font-size: 11px; text-shadow: 1px 1px 2px rgba(255,255,255,0.5);">5x</div>
            
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 60px;
              height: 60px;
              background: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 28px;
              box-shadow: 0 6px 20px rgba(0,0,0,0.3);
              animation: roulette-bounce 0.3s infinite;
            ">🎲</div>
          </div>
          
          <div style="
            width: 0; height: 0;
            border-left: 15px solid transparent;
            border-right: 15px solid transparent;
            border-top: 25px solid #166534;
            margin: -12px auto 0;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          "></div>
          
          <p style="margin-top: 20px; color: #666; font-size: 16px; animation: roulette-bounce 0.5s infinite;">
            ドキドキ...💓 何が出るかな？
          </p>
        </div>
        
        <!-- 結果表示 -->
        <div id="resultPhase" style="display: none;">
          <!-- パルスリング -->
          <div id="pulseRings" style="position: absolute; top: 50%; left: 50%; pointer-events: none; z-index: 0;"></div>
          
          <!-- メインタイトル（でかい！） -->
          <div id="resultTitle" style="
            font-size: ${isJackpot ? '42px' : isBig ? '36px' : '32px'};
            font-weight: 900;
            margin-bottom: 8px;
            color: ${config.textColor};
            animation: title-slam 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            text-shadow: ${isJackpot ? '0 0 30px rgba(255,215,0,0.8), 0 4px 8px rgba(0,0,0,0.2)' : '0 4px 8px rgba(0,0,0,0.1)'};
            position: relative;
            z-index: 1;
          ">${config.title}</div>
          
          <!-- サブタイトル -->
          <div id="resultSubtitle" style="
            font-size: ${isBig ? '22px' : '18px'};
            color: ${config.textColor};
            margin-bottom: 16px;
            animation: subtitle-slide 0.5s ease 0.3s both;
            position: relative;
            z-index: 1;
          ">${config.subtitle}</div>
          
          <!-- 絵文字（でかい！バウンス） -->
          <div id="resultEmoji" style="
            font-size: ${isJackpot ? '100px' : '80px'}; 
            margin: 16px 0;
            animation: title-slam 0.6s ease 0.2s both, roulette-bounce 0.8s infinite 0.8s;
            filter: drop-shadow(0 8px 16px rgba(0,0,0,0.3));
            position: relative;
            z-index: 1;
          ">${result.roulette.emoji}</div>
          
          <!-- 部署横断ボーナス表示 -->
          ${result.is_cross_department ? `
            <div style="
              background: linear-gradient(135deg, #60a5fa, #3b82f6);
              color: white;
              padding: 8px 20px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: bold;
              display: inline-block;
              margin-bottom: 16px;
              animation: subtitle-slide 0.5s ease 0.4s both;
              box-shadow: 0 4px 15px rgba(59,130,246,0.4);
            ">
              🌉 部署横断ボーナス！
            </div>
          ` : ''}
          
          <!-- ポイント表示（超でかい！爆発アニメ） -->
          <div style="
            background: ${config.bgColor};
            background-size: 200% 200%;
            animation: ${isJackpot ? 'rainbow-bg 2s ease infinite,' : ''} points-explode 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.5s both;
            border-radius: 24px;
            padding: 24px;
            color: white;
            box-shadow: ${isJackpot ? '0 0 50px rgba(255,215,0,0.7)' : '0 8px 30px rgba(34,197,94,0.4)'};
            position: relative;
            z-index: 1;
          ">
            <div style="font-size: 16px; opacity: 0.9; margin-bottom: 8px;">🎁 獲得ポイント</div>
            <div id="resultPoints" style="
              font-size: ${isJackpot ? '64px' : '56px'}; 
              font-weight: 900;
              text-shadow: 0 4px 8px rgba(0,0,0,0.2);
              line-height: 1;
            ">+${result.points}pt</div>
            <div style="font-size: 14px; opacity: 0.8; margin-top: 8px;">
              基本 ${result.base_points}pt × <span style="font-weight: bold;">${multiplier}倍</span>
            </div>
          </div>
          
          <!-- 戻るボタン -->
          <button id="rouletteCloseBtn" style="
            margin-top: 24px;
            background: linear-gradient(145deg, #6b7280, #4b5563);
            border: none;
            border-radius: 18px;
            color: white;
            font-weight: bold;
            padding: 16px 50px;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.2s;
            animation: subtitle-slide 0.5s ease 0.8s both;
            box-shadow: 0 6px 20px rgba(0,0,0,0.25);
            position: relative;
            z-index: 1;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            ← 戻る
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 2.8秒後に結果を表示
  setTimeout(() => {
    // 画面フラッシュ
    const flash = document.getElementById('screenFlash');
    flash.style.animation = 'screen-flash 0.3s ease';
    
    // 画面を揺らす（大当たり時）
    if (isBig) {
      document.getElementById('rouletteCard').style.animation = 'mega-shake 0.8s ease';
    }
    
    // フェーズ切り替え
    document.getElementById('spinningPhase').style.display = 'none';
    document.getElementById('resultPhase').style.display = 'block';
    
    // パルスリング生成
    createPulseRings(result.roulette.color, multiplier);
    
    // 紙吹雪を生成（ボーナス時）
    if (isBonus) {
      createConfetti(multiplier);
    }
    
    // スパークルを生成
    createSparkles(multiplier);
    
    // フローティング絵文字を生成
    createFloatingEmojis(result.roulette.emoji, multiplier);
    
    // バイブレーション
    if (navigator.vibrate) {
      if (isJackpot) {
        navigator.vibrate([100, 50, 100, 50, 200, 100, 300, 100, 500]);
      } else if (isBig) {
        navigator.vibrate([100, 50, 150, 50, 200]);
      } else if (isBonus) {
        navigator.vibrate([80, 40, 100]);
      } else {
        navigator.vibrate([50, 30, 50]);
      }
    }
    
    // 音を鳴らす代わりに追加エフェクト（2秒後にさらに絵文字）
    if (isJackpot) {
      setTimeout(() => createFloatingEmojis('🎊', 5), 500);
      setTimeout(() => createFloatingEmojis('🌟', 5), 1000);
    }
    
    // 閉じるボタン
    document.getElementById('rouletteCloseBtn').onclick = () => {
      modal.remove();
      if (callback) callback();
    };
  }, 2800);
}

// パルスリングを生成
function createPulseRings(color, multiplier) {
  const container = document.getElementById('pulseRings');
  const ringCount = multiplier >= 5 ? 5 : multiplier >= 2 ? 3 : 1;
  
  for (let i = 0; i < ringCount; i++) {
    const ring = document.createElement('div');
    ring.style.cssText = `
      position: absolute;
      width: 100px;
      height: 100px;
      border: 4px solid ${color};
      border-radius: 50%;
      animation: pulse-ring 1.5s ease-out infinite ${i * 0.3}s;
    `;
    container.appendChild(ring);
  }
}

// 紙吹雪を生成
function createConfetti(multiplier) {
  const container = document.getElementById('confettiContainer');
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fd79a8', '#a29bfe', '#FFD700', '#ff9ff3'];
  const shapes = ['■', '●', '▲', '★', '♦', '❤'];
  const count = multiplier >= 5 ? 100 : multiplier >= 2 ? 60 : 30;
  
  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.textContent = shapes[Math.floor(Math.random() * shapes.length)];
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.fontSize = (10 + Math.random() * 20) + 'px';
    confetti.style.animationDelay = Math.random() * 1.5 + 's';
    confetti.style.animationDuration = (3 + Math.random() * 3) + 's';
    container.appendChild(confetti);
  }
}

// スパークルを生成
function createSparkles(multiplier) {
  const container = document.getElementById('sparkleContainer');
  const count = multiplier >= 5 ? 15 : multiplier >= 2 ? 8 : 4;
  
  for (let i = 0; i < count; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle-star';
    sparkle.textContent = '✨';
    sparkle.style.left = (10 + Math.random() * 80) + '%';
    sparkle.style.top = (10 + Math.random() * 80) + '%';
    sparkle.style.animationDelay = Math.random() * 2 + 's';
    container.appendChild(sparkle);
  }
}

// フローティング絵文字を生成
function createFloatingEmojis(emoji, multiplier) {
  const container = document.getElementById('floatingContainer');
  const emojis = ['✨', '🌟', '💫', '⭐', emoji, '🎉', '🎊', '💝', '🌸'];
  const count = multiplier >= 5 ? 25 : multiplier >= 2 ? 15 : 8;
  
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const floater = document.createElement('div');
      floater.className = 'floating-emoji';
      floater.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      floater.style.left = (10 + Math.random() * 80) + '%';
      floater.style.top = (40 + Math.random() * 40) + '%';
      floater.style.fontSize = (20 + Math.random() * 20) + 'px';
      floater.style.animationDuration = (1.5 + Math.random()) + 's';
      container.appendChild(floater);
      
      setTimeout(() => floater.remove(), 2500);
    }, i * 100);
  }
}

// ========================================
// 感謝送信（ルーレット付き）
// ========================================

async function sendThanks() {
  const receiverId = document.getElementById('receiverSelect').value;
  const message = document.getElementById('messageInput').value.trim();
  
  if (!receiverId) {
    alert('送り先を選択してください');
    return;
  }
  
  if (!message) {
    alert('メッセージを入力してください');
    return;
  }
  
  if (currentUser.daily_seeds <= 0) {
    alert('今日の種は使い切りました。明日また送れます！🌱');
    return;
  }
  
  // ボタンを無効化
  const sendBtn = document.getElementById('sendThanksBtn');
  sendBtn.disabled = true;
  sendBtn.textContent = '送信中...';
  
  try {
    const response = await axios.post('/api/thanks/send', {
      sender_id: currentUser.id,
      receiver_id: parseInt(receiverId),
      message: message
    });
    
    // 🎰 ルーレットモーダルを表示！
    showRouletteModal(response.data, async () => {
      // ユーザー情報更新
      const userResponse = await axios.get(`/api/users/${currentUser.id}`);
      currentUser = userResponse.data.user;
      
      document.getElementById('seedCount').textContent = currentUser.daily_seeds;
      const totalPoints = Math.round((currentUser.total_received_points || 0) + (currentUser.total_sent_points || 0));
      document.getElementById('totalPoints').textContent = totalPoints;
      currentUser.total_points = totalPoints;
      updateMyTree();
      
      // フォームリセット
      document.getElementById('receiverSelect').value = '';
      document.getElementById('messageInput').value = '';
      
      // タイムライン更新
      if (currentView === 'timeline') {
        loadTimeline();
      }
      
      // 庭更新
      if (currentView === 'garden') {
        loadGarden();
      }
    });
    
  } catch (error) {
    console.error('感謝送信エラー:', error);
    alert(error.response?.data?.error || '送信に失敗しました');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = '🌸 感謝を送る（種を1個使用）';
  }
}

// タブ切り替え
function switchTab(tab) {
  currentView = tab;
  
  // タブボタンの状態更新（デスクトップ）
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  // ナビアイテムの状態更新（モバイル）
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  // タブコンテンツの表示切り替え
  document.querySelectorAll('#tabContent > div').forEach(content => {
    content.classList.add('hidden');
  });
  document.getElementById(`${tab}Tab`).classList.remove('hidden');
  
  // コンテンツ読み込み
  switch (tab) {
    case 'companytree': loadCompanyTree(); break;
    case 'garden': loadGarden(); break;
    case 'timeline': loadTimeline(); break;
    case 'ranking': loadRanking(); break;
    case 'monthly': break; // 月選択で読み込み
  }
}

// カンパニーツリー読み込み
async function loadCompanyTree() {
  const container = document.getElementById('companyTreeDisplay');
  container.innerHTML = '<div class="text-center py-8 text-green-600">🌲 読み込み中...</div>';
  
  try {
    // カンパニーツリーと部署ランキングを同時取得
    const [treeRes, rankingRes] = await Promise.all([
      axios.get('/api/companytree/current'),
      axios.get('/api/rankings/department')
    ]);
    
    const { tree, departments: deptStats, bridges } = treeRes.data;
    const deptRanking = rankingRes.data.ranking || [];
    
    container.innerHTML = `
      <div class="grid md:grid-cols-3 gap-4 mb-6">
        <div class="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-4 text-center">
          <div class="text-3xl mb-2">🌳</div>
          <div class="text-2xl font-bold text-green-700">${tree.tree_level}</div>
          <div class="text-sm text-green-600">ツリーレベル</div>
        </div>
        <div class="bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl p-4 text-center">
          <div class="text-3xl mb-2">💝</div>
          <div class="text-2xl font-bold text-pink-700">${tree.total_thanks_count}</div>
          <div class="text-sm text-pink-600">今月の感謝数</div>
        </div>
        <div class="bg-gradient-to-br from-blue-100 to-sky-100 rounded-xl p-4 text-center">
          <div class="text-3xl mb-2">🌉</div>
          <div class="text-2xl font-bold text-blue-700">${tree.cross_department_count}</div>
          <div class="text-sm text-blue-600">部署横断</div>
        </div>
      </div>
      
      <!-- 部署平均ランキング -->
      <h4 class="text-lg font-bold text-green-700 mb-3">🏆 部署別平均ランキング</h4>
      <div class="space-y-2 mb-6">
        ${deptRanking.map((dept, i) => `
          <div class="bg-white rounded-xl p-3 border-2 ${i < 3 ? 'border-yellow-200' : 'border-gray-100'}">
            <div class="flex items-center gap-3">
              <div class="w-8 text-center text-lg font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-500'}">
                ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full" style="background-color: ${dept.department_color}"></div>
                  <span class="font-semibold">${dept.department_name}</span>
                  <span class="text-xs text-gray-400">(${dept.member_count}名)</span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-blue-600 font-bold">${dept.avg_points}pt</div>
                <div class="text-xs text-gray-400">平均</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <h4 class="text-lg font-bold text-green-700 mb-3">📊 部署別統計</h4>
      <div class="space-y-3">
        ${deptStats.map(dept => `
          <div class="bg-white rounded-xl p-4 border-2 border-gray-100 hover:border-green-200 transition">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-4 h-4 rounded-full" style="background-color: ${dept.color}"></div>
                <span class="font-semibold">${dept.name}</span>
              </div>
              <div class="flex gap-4 text-sm">
                <span class="text-green-600">📤 ${dept.thanks_sent}</span>
                <span class="text-blue-600">📥 ${dept.thanks_received}</span>
                <span class="text-purple-600">⭐ ${dept.points_sent + dept.points_received}pt</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    console.error('カンパニーツリー読み込みエラー:', error);
    container.innerHTML = '<div class="text-center py-8 text-red-500">読み込みに失敗しました</div>';
  }
}

// 庭の読み込み
async function loadGarden() {
  const container = document.getElementById('gardenVisualization');
  container.innerHTML = '<div class="text-center py-8 text-green-600">🏡 庭を読み込み中...</div>';
  
  try {
    const yearMonth = getCurrentYearMonth();
    const response = await axios.get(`/api/garden/state/${yearMonth}`);
    
    if (response.data && response.data.state) {
      container.innerHTML = renderGarden(response.data);
    } else {
      container.innerHTML = `
        <div class="text-center py-8">
          <div class="text-6xl mb-4">🌱</div>
          <p class="text-green-600">まだ庭がありません</p>
          <p class="text-sm text-gray-500">感謝を送ると庭が育ちます！</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('庭の読み込みエラー:', error);
    container.innerHTML = `
      <div class="text-center py-8">
        <div class="text-4xl mb-4">🌱</div>
        <p class="text-green-600">庭データの読み込みに失敗しました</p>
        <p class="text-sm text-gray-500">感謝を送ると庭が自動的に作成されます</p>
      </div>
    `;
  }
}

// タイムライン読み込み
async function loadTimeline() {
  const container = document.getElementById('timelineDisplay');
  container.innerHTML = '<div class="text-center py-8 text-green-600">📜 読み込み中...</div>';
  
  try {
    const response = await axios.get('/api/thanks/timeline?limit=30');
    const thanks = response.data.thanks;
    
    if (thanks.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <div class="text-4xl mb-4">💭</div>
          <p class="text-green-600">まだ感謝メッセージがありません</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="space-y-4">
        ${thanks.map(t => {
          const hasBonus = t.bonus_multiplier && t.bonus_multiplier > 1;
          const bonusLabel = hasBonus ? getBonusLabel(t.bonus_multiplier) : null;
          return `
          <div class="bg-white rounded-xl p-4 border-2 border-gray-100 hover:border-green-200 transition ${hasBonus ? 'ring-2 ring-yellow-300' : ''}">
            <div class="flex items-start gap-3">
              <div class="text-3xl">${t.is_cross_department ? '🌉' : '💝'}</div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span class="font-semibold" style="color: ${t.sender_color}">${t.sender_name}</span>
                  <span class="text-gray-400">→</span>
                  <span class="font-semibold" style="color: ${t.receiver_color}">${t.receiver_name}</span>
                  ${hasBonus ? `<span class="text-xs px-2 py-1 rounded-full" style="background: ${bonusLabel.color}; color: white;">${bonusLabel.emoji} ${t.bonus_multiplier}x</span>` : ''}
                  <span class="text-sm text-green-600 ml-auto font-bold">+${t.final_points || t.points}pt</span>
                </div>
                <p class="text-gray-700">${t.message}</p>
                <p class="text-xs text-gray-400 mt-2">${formatDate(t.created_at)}</p>
              </div>
            </div>
          </div>
        `}).join('')}
      </div>
    `;
  } catch (error) {
    console.error('タイムライン読み込みエラー:', error);
    container.innerHTML = '<div class="text-center py-8 text-red-500">読み込みに失敗しました</div>';
  }
}

// ボーナスラベルを取得
function getBonusLabel(multiplier) {
  const labels = {
    1.5: { emoji: '🍀', color: '#95E1D3' },
    2: { emoji: '✨', color: '#4ECDC4' },
    3: { emoji: '🌟', color: '#FF6B6B' },
    5: { emoji: '🎰', color: '#FFD700' }
  };
  return labels[multiplier] || { emoji: '💚', color: '#A5D6A7' };
}

// ランキング読み込み
async function loadRanking() {
  const container = document.getElementById('rankingDisplay');
  container.innerHTML = '<div class="text-center py-8 text-green-600">🏆 読み込み中...</div>';
  
  try {
    const [individualRes, deptRes] = await Promise.all([
      axios.get('/api/rankings/individual?limit=100'),
      axios.get('/api/rankings/department')
    ]);
    
    // APIは ranking を返す（rankings ではない）
    const individuals = individualRes.data.ranking || individualRes.data.rankings || [];
    const depts = deptRes.data.ranking || deptRes.data.rankings || [];
    
    container.innerHTML = `
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <h4 class="text-lg font-bold text-green-700 mb-3">👤 個人ランキング <span class="text-sm font-normal text-gray-500">(${individuals.length}名)</span></h4>
          <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
            ${individuals.map((user, i) => `
              <div class="flex items-center gap-3 bg-white rounded-xl p-3 border-2 ${i < 3 ? 'border-yellow-200' : 'border-gray-100'}">
                <div class="w-8 text-center text-lg font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-500'}">
                  ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold truncate">${user.user_name || user.name}</div>
                  <div class="text-xs text-gray-500 flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full inline-block" style="background-color: ${user.department_color}"></span>
                    ${user.department_name}
                  </div>
                </div>
                <div class="text-green-600 font-bold whitespace-nowrap">${user.points || user.total_points}pt</div>
              </div>
            `).join('')}
            ${individuals.length === 0 ? '<div class="text-center py-4 text-gray-500">まだデータがありません</div>' : ''}
          </div>
        </div>
        
        <div>
          <h4 class="text-lg font-bold text-green-700 mb-3">🏢 部署ランキング</h4>
          <div class="space-y-2">
            ${depts.map((dept, i) => `
              <div class="bg-white rounded-xl p-3 border-2 ${i < 3 ? 'border-yellow-200' : 'border-gray-100'}">
                <div class="flex items-center gap-3">
                  <div class="w-8 text-center text-lg font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-500'}">
                    ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <div class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${dept.department_color || dept.color}"></div>
                      <span class="font-semibold">${dept.department_name || dept.name}</span>
                      <span class="text-xs text-gray-400">(${dept.member_count}名)</span>
                    </div>
                  </div>
                  <div class="text-green-600 font-bold whitespace-nowrap">${dept.total_points}pt</div>
                </div>
                <div class="mt-2 ml-11 flex items-center gap-4 text-xs text-gray-500">
                  <span>👤 平均: <span class="font-semibold text-blue-600">${dept.avg_points}pt</span></span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('ランキング読み込みエラー:', error);
    container.innerHTML = '<div class="text-center py-8 text-red-500">読み込みに失敗しました</div>';
  }
}

// 月リスト読み込み
async function loadMonthList() {
  try {
    const response = await axios.get('/api/monthly/list');
    const months = response.data.months;
    
    const select = document.getElementById('monthSelect');
    select.innerHTML = '<option value="">月を選択...</option>';
    months.forEach(m => {
      select.innerHTML += `<option value="${m.year_month}">${m.year_month}</option>`;
    });
  } catch (error) {
    console.error('月リスト読み込みエラー:', error);
  }
}

// 月別レポート読み込み
async function loadMonthlyReport(yearMonth) {
  const container = document.getElementById('monthlyDisplay');
  container.innerHTML = '<div class="text-center py-8 text-green-600">📊 読み込み中...</div>';
  
  try {
    const response = await axios.get(`/api/monthly/report/${yearMonth}`);
    const { tree, departments: depts, top_individuals, bridges } = response.data;
    
    container.innerHTML = `
      <div class="grid md:grid-cols-4 gap-4 mb-6">
        <div class="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-4 text-center">
          <div class="text-2xl mb-1">💝</div>
          <div class="text-2xl font-bold text-green-700">${tree.total_thanks_count}</div>
          <div class="text-xs text-green-600">感謝数</div>
        </div>
        <div class="bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl p-4 text-center">
          <div class="text-2xl mb-1">⭐</div>
          <div class="text-2xl font-bold text-yellow-700">${tree.total_points}</div>
          <div class="text-xs text-yellow-600">総ポイント</div>
        </div>
        <div class="bg-gradient-to-br from-blue-100 to-sky-100 rounded-xl p-4 text-center">
          <div class="text-2xl mb-1">🌉</div>
          <div class="text-2xl font-bold text-blue-700">${tree.cross_department_count}</div>
          <div class="text-xs text-blue-600">部署横断</div>
        </div>
        <div class="bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl p-4 text-center">
          <div class="text-2xl mb-1">🌳</div>
          <div class="text-2xl font-bold text-purple-700">${tree.tree_level}</div>
          <div class="text-xs text-purple-600">ツリーLv</div>
        </div>
      </div>
      
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <h4 class="text-lg font-bold text-green-700 mb-3">🏢 部署別</h4>
          <div class="space-y-2">
            ${depts.map(d => `
              <div class="flex items-center justify-between bg-white rounded-lg p-3 border">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full" style="background-color: ${d.color}"></div>
                  <span>${d.name}</span>
                </div>
                <span class="text-green-600 font-semibold">${d.points_sent + d.points_received}pt</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div>
          <h4 class="text-lg font-bold text-green-700 mb-3">👑 トップ10</h4>
          <div class="space-y-2">
            ${top_individuals.slice(0, 10).map((u, i) => `
              <div class="flex items-center gap-2 bg-white rounded-lg p-2 border">
                <span class="w-6 text-center ${i < 3 ? 'font-bold' : ''}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
                <span class="flex-1">${u.name}</span>
                <span class="text-green-600">${u.total_points}pt</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('月別レポート読み込みエラー:', error);
    container.innerHTML = '<div class="text-center py-8 text-red-500">読み込みに失敗しました</div>';
  }
}

// 日付フォーマット
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'たった今';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}日前`;
  
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
