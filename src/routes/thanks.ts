import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// ルーレットの結果を生成
function spinRoulette(): { multiplier: number; label: string; emoji: string; color: string } {
  const random = Math.random() * 100;
  
  // 確率分布:
  // 1x (40%) - 通常
  // 1.5x (30%) - ラッキー
  // 2x (20%) - スーパー
  // 3x (8%) - ウルトラ
  // 5x (2%) - ジャックポット！
  
  if (random < 2) {
    return { multiplier: 5, label: 'ジャックポット！', emoji: '🎰', color: '#FFD700' };
  } else if (random < 10) {
    return { multiplier: 3, label: 'ウルトラ！', emoji: '🌟', color: '#FF6B6B' };
  } else if (random < 30) {
    return { multiplier: 2, label: 'スーパー！', emoji: '✨', color: '#4ECDC4' };
  } else if (random < 60) {
    return { multiplier: 1.5, label: 'ラッキー！', emoji: '🍀', color: '#95E1D3' };
  } else {
    return { multiplier: 1, label: 'ノーマル', emoji: '💚', color: '#A5D6A7' };
  }
}

// 日本時間の現在年月を取得
function getJSTYearMonth(): string {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstTime = new Date(now.getTime() + jstOffset);
  const year = jstTime.getUTCFullYear();
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ツリーレベルを更新
async function updateTreeLevel(DB: D1Database, userId: number) {
  try {
    const user = await DB.prepare(`
      SELECT total_received_points, total_sent_points FROM users WHERE id = ?
    `).bind(userId).first() as any;
    
    if (!user) return;
    
    const totalPoints = (user.total_received_points || 0) + (user.total_sent_points || 0);
    
    // ツリーレベルの閾値
    const levels = [
      { level: 1, min: 0 },
      { level: 2, min: 50 },
      { level: 3, min: 150 },
      { level: 4, min: 300 },
      { level: 5, min: 500 },
      { level: 6, min: 800 },
      { level: 7, min: 1200 },
      { level: 8, min: 1800 },
      { level: 9, min: 2500 },
      { level: 10, min: 3500 }
    ];
    
    let newLevel = 1;
    for (const l of levels) {
      if (totalPoints >= l.min) {
        newLevel = l.level;
      }
    }
    
    await DB.prepare(`
      UPDATE users SET tree_level = ? WHERE id = ?
    `).bind(newLevel, userId).run();
  } catch (error) {
    console.error('Failed to update tree level:', error);
  }
}

// 庭の状態を更新
async function updateGardenState(DB: D1Database) {
  try {
    const yearMonth = getJSTYearMonth();
    
    // 今月の感謝数をカウント
    const countResult = await DB.prepare(`
      SELECT COUNT(*) as count FROM thanks
      WHERE strftime('%Y-%m', created_at) = ?
    `).bind(yearMonth).first() as any;
    
    const totalThanks = countResult?.count || 0;
    
    // 庭レベルの閾値と属性
    let gardenLevel = 1, gardenSize = 3, treeCount = 1, flowerBeds = 0;
    let hasPond = 0, hasFountain = 0, hasGazebo = 0, hasBuilding = 0;
    
    if (totalThanks >= 150) {
      gardenLevel = 6; gardenSize = 13; treeCount = 8; flowerBeds = 6;
      hasPond = 1; hasFountain = 1; hasGazebo = 1; hasBuilding = 1;
    } else if (totalThanks >= 100) {
      gardenLevel = 5; gardenSize = 11; treeCount = 6; flowerBeds = 5;
      hasPond = 1; hasFountain = 1; hasGazebo = 1;
    } else if (totalThanks >= 60) {
      gardenLevel = 4; gardenSize = 9; treeCount = 4; flowerBeds = 4;
      hasPond = 1; hasFountain = 1;
    } else if (totalThanks >= 30) {
      gardenLevel = 3; gardenSize = 7; treeCount = 3; flowerBeds = 3;
      hasPond = 1;
    } else if (totalThanks >= 10) {
      gardenLevel = 2; gardenSize = 5; treeCount = 2; flowerBeds = 2;
    }
    
    // 庭の状態を更新（存在しなければ作成）
    await DB.prepare(`
      INSERT INTO garden_state (year_month, garden_level, garden_size, tree_count, flower_beds, has_pond, has_fountain, has_gazebo, has_building, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(year_month) DO UPDATE SET
        garden_level = excluded.garden_level,
        garden_size = excluded.garden_size,
        tree_count = excluded.tree_count,
        flower_beds = excluded.flower_beds,
        has_pond = excluded.has_pond,
        has_fountain = excluded.has_fountain,
        has_gazebo = excluded.has_gazebo,
        has_building = excluded.has_building,
        updated_at = datetime('now')
    `).bind(yearMonth, gardenLevel, gardenSize, treeCount, flowerBeds, hasPond, hasFountain, hasGazebo, hasBuilding).run();
  } catch (error) {
    console.error('Failed to update garden state:', error);
  }
}

// タイムライン取得
app.get('/timeline', async (c) => {
  const { DB } = c.env;
  const limit = parseInt(c.req.query('limit') || '30');
  
  try {
    const result = await DB.prepare(`
      SELECT 
        t.id,
        t.sender_id,
        t.receiver_id,
        t.message,
        t.points,
        t.bonus_multiplier,
        t.final_points,
        t.is_cross_department,
        t.created_at,
        s.name as sender_name,
        r.name as receiver_name,
        sd.color as sender_color,
        rd.color as receiver_color
      FROM thanks t
      JOIN users s ON t.sender_id = s.id
      JOIN users r ON t.receiver_id = r.id
      JOIN departments sd ON s.department_id = sd.id
      JOIN departments rd ON r.department_id = rd.id
      ORDER BY t.created_at DESC
      LIMIT ?
    `).bind(limit).all();
    
    return c.json({ thanks: result.results });
  } catch (error) {
    console.error('Failed to get timeline:', error);
    return c.json({ error: 'Failed to get timeline' }, 500);
  }
});

// 感謝送信
app.post('/send', async (c) => {
  const { DB } = c.env;
  
  try {
    const body = await c.req.json();
    const { sender_id, receiver_id, message } = body;
    
    // バリデーション
    if (!sender_id || !receiver_id || !message) {
      return c.json({ error: '送信者、受信者、メッセージは必須です' }, 400);
    }
    
    if (sender_id === receiver_id) {
      return c.json({ error: '自分自身には送れません' }, 400);
    }
    
    // 送信者情報取得
    const sender = await DB.prepare(`
      SELECT u.*, d.id as dept_id, d.name as dept_name
      FROM users u
      JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `).bind(sender_id).first() as any;
    
    if (!sender) {
      return c.json({ error: '送信者が見つかりません' }, 404);
    }
    
    if (sender.daily_seeds <= 0) {
      return c.json({ error: '今日の種を使い切りました。明日また送れます！🌱' }, 400);
    }
    
    // 受信者情報取得
    const receiver = await DB.prepare(`
      SELECT u.*, d.id as dept_id, d.name as dept_name
      FROM users u
      JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `).bind(receiver_id).first() as any;
    
    if (!receiver) {
      return c.json({ error: '受信者が見つかりません' }, 404);
    }
    
    // 72時間クールダウンチェック
    const recentThanks = await DB.prepare(`
      SELECT id FROM thanks
      WHERE sender_id = ? AND receiver_id = ?
      AND created_at > datetime('now', '-72 hours')
    `).bind(sender_id, receiver_id).first();
    
    if (recentThanks) {
      return c.json({ error: 'この相手には72時間以内に感謝を送っています。別の人に送りましょう！💝' }, 400);
    }
    
    // 基本ポイント計算
    const isCrossDepartment = sender.dept_id !== receiver.dept_id;
    const basePoints = isCrossDepartment ? 15 : 10;
    
    // 🎰 ルーレットを回す！
    const rouletteResult = spinRoulette();
    const finalPoints = Math.floor(basePoints * rouletteResult.multiplier);
    
    // 感謝を記録（ルーレット結果も保存）
    await DB.prepare(`
      INSERT INTO thanks (sender_id, receiver_id, message, points, bonus_multiplier, final_points, is_cross_department)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sender_id, 
      receiver_id, 
      message, 
      basePoints, 
      rouletteResult.multiplier,
      finalPoints,
      isCrossDepartment ? 1 : 0
    ).run();
    
    // 送信者の種を減らし、送信ポイントを増やす
    // 本番DBはtotal_sent_pointsとtotal_received_pointsを使用
    await DB.prepare(`
      UPDATE users 
      SET daily_seeds = daily_seeds - 1,
          total_sent_points = total_sent_points + ?
      WHERE id = ?
    `).bind(finalPoints, sender_id).run();
    
    // 受信者の受信ポイントを増やす
    await DB.prepare(`
      UPDATE users 
      SET total_received_points = total_received_points + ?
      WHERE id = ?
    `).bind(finalPoints, receiver_id).run();
    
    // 送信者と受信者のツリーレベルを更新
    await updateTreeLevel(DB, sender_id);
    await updateTreeLevel(DB, receiver_id);
    
    // 庭の状態を更新
    await updateGardenState(DB);
    
    return c.json({
      success: true,
      message: '感謝を送りました！',
      receiver_name: receiver.name,
      base_points: basePoints,
      points: finalPoints,
      is_cross_department: isCrossDepartment,
      roulette: {
        multiplier: rouletteResult.multiplier,
        label: rouletteResult.label,
        emoji: rouletteResult.emoji,
        color: rouletteResult.color
      },
      remaining_seeds: sender.daily_seeds - 1
    });
  } catch (error) {
    console.error('Failed to send thanks:', error);
    return c.json({ error: '送信に失敗しました' }, 500);
  }
});

export default app;
