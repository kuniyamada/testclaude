import { Hono } from 'hono';
import type { Bindings } from '../types';

const thanks = new Hono<{ Bindings: Bindings }>();

// タイムライン取得
thanks.get('/timeline', async (c) => {
  const db = c.env.DB;
  const limit = parseInt(c.req.query('limit') || '30');
  
  const result = await db.prepare(`
    SELECT 
      t.*,
      s.name as sender_name,
      sd.name as sender_department,
      sd.color as sender_department_color,
      r.name as receiver_name,
      rd.name as receiver_department,
      rd.color as receiver_department_color
    FROM thanks t
    JOIN users s ON t.sender_id = s.id
    JOIN users r ON t.receiver_id = r.id
    JOIN departments sd ON s.department_id = sd.id
    JOIN departments rd ON r.department_id = rd.id
    ORDER BY t.created_at DESC
    LIMIT ?
  `).bind(limit).all();
  
  return c.json({ thanks: result.results });
});

// 感謝を送る
thanks.post('/send', async (c) => {
  const db = c.env.DB;
  const { sender_id, receiver_id, message } = await c.req.json();
  
  // バリデーション
  if (!sender_id || !receiver_id || !message) {
    return c.json({ error: '必須項目が不足しています' }, 400);
  }
  
  if (sender_id === receiver_id) {
    return c.json({ error: '自分自身に感謝は送れません' }, 400);
  }
  
  // 送信者情報取得
  const sender = await db.prepare(`
    SELECT u.*, d.id as dept_id FROM users u 
    JOIN departments d ON u.department_id = d.id 
    WHERE u.id = ?
  `).bind(sender_id).first() as any;
  
  if (!sender) {
    return c.json({ error: '送信者が見つかりません' }, 404);
  }
  
  if (sender.daily_seeds <= 0) {
    return c.json({ error: '今日の種を使い切りました。明日また送れます！' }, 400);
  }
  
  // 受信者情報取得
  const receiver = await db.prepare(`
    SELECT u.*, d.id as dept_id FROM users u 
    JOIN departments d ON u.department_id = d.id 
    WHERE u.id = ?
  `).bind(receiver_id).first() as any;
  
  if (!receiver) {
    return c.json({ error: '受信者が見つかりません' }, 404);
  }
  
  // クールダウンチェック（72時間）
  const cooldownCheck = await db.prepare(`
    SELECT * FROM thanks 
    WHERE sender_id = ? AND receiver_id = ? 
    AND created_at > datetime('now', '-72 hours')
    ORDER BY created_at DESC LIMIT 1
  `).bind(sender_id, receiver_id).first();
  
  if (cooldownCheck) {
    return c.json({ error: 'この相手には72時間以内に感謝を送っています。別の人に送りましょう！' }, 400);
  }
  
  // ポイント計算（部署横断は15pt、同部署は10pt）
  const isCrossDepartment = sender.dept_id !== receiver.dept_id;
  const points = isCrossDepartment ? 15 : 10;
  
  // 感謝を記録
  await db.prepare(`
    INSERT INTO thanks (sender_id, receiver_id, points, message, is_cross_department)
    VALUES (?, ?, ?, ?, ?)
  `).bind(sender_id, receiver_id, points, message, isCrossDepartment ? 1 : 0).run();
  
  // 送信者の種を減らす
  await db.prepare('UPDATE users SET daily_seeds = daily_seeds - 1 WHERE id = ?')
    .bind(sender_id).run();
  
  // 受信者のポイントを増やす
  await db.prepare('UPDATE users SET total_received_points = total_received_points + ? WHERE id = ?')
    .bind(points, receiver_id).run();
  
  return c.json({ 
    success: true, 
    message: isCrossDepartment ? '🌟 部署横断ボーナス！15ポイント！' : '💚 感謝を送りました！10ポイント！',
    points,
    is_cross_department: isCrossDepartment,
    remaining_seeds: sender.daily_seeds - 1
  });
});

export default thanks;
