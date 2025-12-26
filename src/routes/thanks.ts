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
    
    // 送信者の種を減らし、ポイントを増やす
    await DB.prepare(`
      UPDATE users 
      SET daily_seeds = daily_seeds - 1,
          total_points = total_points + ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(finalPoints, sender_id).run();
    
    // 受信者のポイントも増やす
    await DB.prepare(`
      UPDATE users 
      SET total_points = total_points + ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(Math.floor(finalPoints * 0.5), receiver_id).run();
    
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
