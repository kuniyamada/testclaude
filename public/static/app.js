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
// 🎰 ルーレットモーダル
// ========================================

const ROULETTE_ITEMS = [
  { multiplier: 1, label: 'ノーマル', emoji: '💚', color: '#A5D6A7', weight: 40 },
  { multiplier: 1.5, label: 'ラッキー！', emoji: '🍀', color: '#95E1D3', weight: 30 },
  { multiplier: 2, label: 'スーパー！', emoji: '✨', color: '#4ECDC4', weight: 20 },
  { multiplier: 3, label: 'ウルトラ！', emoji: '🌟', color: '#FF6B6B', weight: 8 },
  { multiplier: 5, label: 'ジャックポット！', emoji: '🎰', color: '#FFD700', weight: 2 }
];

// ルーレットモーダルを表示
function showRouletteModal(result, callback) {
  // モーダルを作成
  const modal = document.createElement('div');
  modal.id = 'rouletteModal';
  modal.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease;
    ">
      <div style="
        background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
        border-radius: 24px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: popIn 0.5s ease;
      ">
        <h2 style="font-size: 24px; color: #166534; margin-bottom: 16px;">
          🎰 ボーナスルーレット！
        </h2>
        
        <!-- ルーレットホイール -->
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
          animation: spin 3s cubic-bezier(0.17, 0.67, 0.12, 0.99) forwards;
          box-shadow: 0 0 20px rgba(0,0,0,0.2), inset 0 0 30px rgba(255,255,255,0.3);
        ">
          <!-- 中央の円 -->
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
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          ">🎲</div>
        </div>
        
        <!-- ポインター -->
        <div style="
          width: 0;
          height: 0;
          border-left: 15px solid transparent;
          border-right: 15px solid transparent;
          border-top: 25px solid #166534;
          margin: -10px auto 20px;
        "></div>
        
        <!-- 結果表示（最初は非表示） -->
        <div id="rouletteResult" style="display: none;">
          <div id="resultEmoji" style="font-size: 64px; margin-bottom: 12px; animation: bounce 0.5s ease infinite;"></div>
          <div id="resultLabel" style="font-size: 28px; font-weight: bold; margin-bottom: 8px;"></div>
          <div id="resultMultiplier" style="font-size: 20px; color: #666; margin-bottom: 16px;"></div>
          <div style="
            background: linear-gradient(135deg, #4ade80, #22c55e);
            border-radius: 16px;
            padding: 16px;
            color: white;
          ">
            <div style="font-size: 14px; opacity: 0.9;">獲得ポイント</div>
            <div id="resultPoints" style="font-size: 36px; font-weight: bold;"></div>
          </div>
          <button id="rouletteCloseBtn" style="
            margin-top: 20px;
            background: linear-gradient(145deg, #4ade80, #22c55e);
            border: none;
            border-radius: 12px;
            color: white;
            font-weight: bold;
            padding: 12px 32px;
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.2s;
          ">OK！</button>
        </div>
      </div>
    </div>
    
    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes popIn {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(${1440 + getRouletteAngle(result.roulette.multiplier)}deg); }
      }
      @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      #rouletteCloseBtn:hover {
        transform: scale(1.05);
      }
    </style>
  `;
  
  document.body.appendChild(modal);
  
  // 3秒後に結果を表示
  setTimeout(() => {
    document.getElementById('rouletteWheel').style.animation = 'none';
    document.getElementById('rouletteResult').style.display = 'block';
    document.getElementById('resultEmoji').textContent = result.roulette.emoji;
    document.getElementById('resultLabel').textContent = result.roulette.label;
    document.getElementById('resultLabel').style.color = result.roulette.color;
    document.getElementById('resultMultiplier').textContent = `${result.roulette.multiplier}x ボーナス！`;
    document.getElementById('resultPoints').textContent = `+${result.points}pt`;
    
    // 効果音代わりにバイブレーション（対応端末のみ）
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
  }, 3000);
  
  // 閉じるボタン
  setTimeout(() => {
    document.getElementById('rouletteCloseBtn').addEventListener('click', () => {
      modal.remove();
      if (callback) callback();
    });
  }, 3100);
}

// 倍率に応じたルーレットの角度を計算
function getRouletteAngle(multiplier) {
  // 各セクションの角度
  // 1x: 0-144deg, 1.5x: 144-252deg, 2x: 252-324deg, 3x: 324-352.8deg, 5x: 352.8-360deg
  const angles = {
    1: 72,      // 0-144の中央
    1.5: 198,   // 144-252の中央
    2: 288,     // 252-324の中央
    3: 338,     // 324-352.8の中央
    5: 356      // 352.8-360の中央
  };
  return angles[multiplier] || 72;
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
    const response = await axios.get('/api/companytree/current');
    const { tree, departments: deptStats, bridges } = response.data;
    
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
      axios.get('/api/rankings/individual?limit=10'),
      axios.get('/api/rankings/department')
    ]);
    
    // APIは ranking を返す（rankings ではない）
    const individuals = individualRes.data.ranking || individualRes.data.rankings || [];
    const depts = deptRes.data.ranking || deptRes.data.rankings || [];
    
    container.innerHTML = `
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <h4 class="text-lg font-bold text-green-700 mb-3">👤 個人ランキング</h4>
          <div class="space-y-2">
            ${individuals.map((user, i) => `
              <div class="flex items-center gap-3 bg-white rounded-xl p-3 border-2 ${i < 3 ? 'border-yellow-200' : 'border-gray-100'}">
                <div class="text-xl font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-500'}">
                  ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </div>
                <div class="flex-1">
                  <div class="font-semibold">${user.user_name || user.name}</div>
                  <div class="text-xs text-gray-500">${user.department_name}</div>
                </div>
                <div class="text-green-600 font-bold">${user.points || user.total_points}pt</div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div>
          <h4 class="text-lg font-bold text-green-700 mb-3">🏢 部署ランキング</h4>
          <div class="space-y-2">
            ${depts.map((dept, i) => `
              <div class="flex items-center gap-3 bg-white rounded-xl p-3 border-2 ${i < 3 ? 'border-yellow-200' : 'border-gray-100'}">
                <div class="text-xl font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-500'}">
                  ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </div>
                <div class="flex-1 flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full" style="background-color: ${dept.department_color || dept.color}"></div>
                  <span class="font-semibold">${dept.department_name || dept.name}</span>
                </div>
                <div class="text-green-600 font-bold">${dept.total_points}pt</div>
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
