import { Hono } from 'hono';
import type { Bindings } from '../types';

type RobloxBindings = Bindings & {
  ROBLOX_API_KEY?: string;
};

const roblox = new Hono<{ Bindings: RobloxBindings }>();

function verifyApiKey(c: any): boolean {
  const apiKey = c.env.ROBLOX_API_KEY;
  if (!apiKey) return true;
  const provided = c.req.header('X-API-Key') || c.req.query('api_key');
  return provided === apiKey;
}

// Robloxアカウント紐付け
roblox.post('/link', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const { user_id, roblox_user_id, roblox_username } = body;

  if (!user_id || !roblox_user_id) {
    return c.json({ error: 'user_id と roblox_user_id は必須です' }, 400);
  }

  const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(user_id).first();
  if (!user) {
    return c.json({ error: 'ユーザーが見つかりません' }, 404);
  }

  const existing = await db.prepare(
    'SELECT id FROM users WHERE roblox_user_id = ? AND id != ?'
  ).bind(roblox_user_id, user_id).first();
  if (existing) {
    return c.json({ error: 'このRobloxアカウントは既に別のユーザーに紐付けられています' }, 409);
  }

  await db.prepare(`
    UPDATE users SET roblox_user_id = ?, roblox_username = ?, roblox_linked_at = datetime('now')
    WHERE id = ?
  `).bind(roblox_user_id, roblox_username || null, user_id).run();

  return c.json({ success: true, message: 'Robloxアカウントを紐付けました' });
});

// Roblox紐付け解除
roblox.post('/unlink', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const { user_id } = body;

  if (!user_id) {
    return c.json({ error: 'user_id は必須です' }, 400);
  }

  await db.prepare(`
    UPDATE users SET roblox_user_id = NULL, roblox_username = NULL, roblox_linked_at = NULL
    WHERE id = ?
  `).bind(user_id).run();

  return c.json({ success: true, message: 'Roblox連携を解除しました' });
});

// Roblox用: ユーザーデータ取得（RobloxユーザーIDで検索）
roblox.get('/user/:robloxUserId', async (c) => {
  if (!verifyApiKey(c)) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  const db = c.env.DB;
  const robloxUserId = c.req.param('robloxUserId');

  const user = await db.prepare(`
    SELECT
      u.id, u.name, u.tree_level, u.total_sent_points, u.total_received_points,
      u.roblox_username, d.name as department_name, d.color as department_color
    FROM users u
    JOIN departments d ON u.department_id = d.id
    WHERE u.roblox_user_id = ?
  `).bind(robloxUserId).first() as any;

  if (!user) {
    return c.json({ error: 'Roblox連携ユーザーが見つかりません', linked: false }, 404);
  }

  const totalPoints = (user.total_sent_points || 0) + (user.total_received_points || 0);

  const treeLevels = [
    { level: 1, emoji: '🌱', name: '芽' },
    { level: 2, emoji: '🌿', name: '若葉' },
    { level: 3, emoji: '🪴', name: '苗木' },
    { level: 4, emoji: '🌳', name: '大木' },
    { level: 5, emoji: '🎄', name: '巨木' },
    { level: 6, emoji: '🏆', name: '世界樹' },
  ];
  const treeInfo = treeLevels[Math.min(user.tree_level - 1, treeLevels.length - 1)];

  return c.json({
    linked: true,
    user: {
      id: user.id,
      name: user.name,
      department: user.department_name,
      department_color: user.department_color,
      roblox_username: user.roblox_username,
      total_points: totalPoints,
      sent_points: user.total_sent_points || 0,
      received_points: user.total_received_points || 0,
      tree: {
        level: user.tree_level,
        emoji: treeInfo.emoji,
        name: treeInfo.name,
      },
    },
  });
});

// Roblox用: ランキング取得
roblox.get('/leaderboard', async (c) => {
  if (!verifyApiKey(c)) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50);

  const result = await db.prepare(`
    SELECT
      u.name, u.tree_level, u.roblox_username,
      u.total_sent_points, u.total_received_points,
      d.name as department_name
    FROM users u
    JOIN departments d ON u.department_id = d.id
    ORDER BY (u.total_sent_points + u.total_received_points) DESC
    LIMIT ?
  `).bind(limit).all();

  const leaderboard = (result.results || []).map((u: any, i: number) => ({
    rank: i + 1,
    name: u.name,
    department: u.department_name,
    roblox_username: u.roblox_username,
    total_points: (u.total_sent_points || 0) + (u.total_received_points || 0),
    tree_level: u.tree_level,
  }));

  return c.json({ leaderboard });
});

// Roblox用: 庭の状態取得
roblox.get('/garden', async (c) => {
  if (!verifyApiKey(c)) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  const db = c.env.DB;
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(now.getTime() + jstOffset);
  const yearMonth = `${jstDate.getUTCFullYear()}-${String(jstDate.getUTCMonth() + 1).padStart(2, '0')}`;

  const garden = await db.prepare(`
    SELECT * FROM garden_state WHERE year_month = ?
  `).bind(yearMonth).first();

  if (!garden) {
    return c.json({
      garden: {
        level: 1, size: 3, tree_count: 0, flower_beds: 0,
        has_pond: false, has_fountain: false, has_gazebo: false, has_building: false,
      },
    });
  }

  return c.json({
    garden: {
      level: (garden as any).garden_level,
      size: (garden as any).garden_size,
      tree_count: (garden as any).tree_count,
      flower_beds: (garden as any).flower_beds,
      has_pond: !!(garden as any).has_pond,
      has_fountain: !!(garden as any).has_fountain,
      has_gazebo: !!(garden as any).has_gazebo,
      has_building: !!(garden as any).has_building,
    },
  });
});

// Roblox用: 最新の感謝タイムライン
roblox.get('/timeline', async (c) => {
  if (!verifyApiKey(c)) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '10'), 30);

  const result = await db.prepare(`
    SELECT
      t.message, t.final_points, t.is_cross_department, t.bonus_multiplier, t.created_at,
      s.name as sender_name, s.roblox_username as sender_roblox,
      r.name as receiver_name, r.roblox_username as receiver_roblox,
      sd.name as sender_dept, rd.name as receiver_dept
    FROM thanks t
    JOIN users s ON t.sender_id = s.id
    JOIN users r ON t.receiver_id = r.id
    JOIN departments sd ON s.department_id = sd.id
    JOIN departments rd ON r.department_id = rd.id
    ORDER BY t.created_at DESC
    LIMIT ?
  `).bind(limit).all();

  const timeline = (result.results || []).map((t: any) => ({
    sender: t.sender_name,
    sender_roblox: t.sender_roblox,
    receiver: t.receiver_name,
    receiver_roblox: t.receiver_roblox,
    message: t.message,
    points: t.final_points,
    multiplier: t.bonus_multiplier,
    cross_department: !!t.is_cross_department,
    sender_dept: t.sender_dept,
    receiver_dept: t.receiver_dept,
    created_at: t.created_at,
  }));

  return c.json({ timeline });
});

// Roblox用: ゲーム内から感謝を送る
roblox.post('/send-thanks', async (c) => {
  if (!verifyApiKey(c)) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  const db = c.env.DB;
  const body = await c.req.json();
  const { sender_roblox_id, receiver_roblox_id, message } = body;

  if (!sender_roblox_id || !receiver_roblox_id || !message) {
    return c.json({ error: 'sender_roblox_id, receiver_roblox_id, message は必須です' }, 400);
  }

  const sender = await db.prepare(`
    SELECT u.*, d.id as dept_id FROM users u
    JOIN departments d ON u.department_id = d.id
    WHERE u.roblox_user_id = ?
  `).bind(sender_roblox_id).first() as any;

  const receiver = await db.prepare(`
    SELECT u.*, d.id as dept_id FROM users u
    JOIN departments d ON u.department_id = d.id
    WHERE u.roblox_user_id = ?
  `).bind(receiver_roblox_id).first() as any;

  if (!sender || !receiver) {
    return c.json({ error: 'Roblox連携ユーザーが見つかりません' }, 404);
  }

  if (sender.id === receiver.id) {
    return c.json({ error: '自分自身には送れません' }, 400);
  }

  if (sender.daily_seeds <= 0) {
    return c.json({ error: '今日の種を使い切りました' }, 400);
  }

  const recent = await db.prepare(`
    SELECT id FROM thanks
    WHERE sender_id = ? AND receiver_id = ?
    AND created_at > datetime('now', '-72 hours')
  `).bind(sender.id, receiver.id).first();

  if (recent) {
    return c.json({ error: '72時間以内に同じ相手に送っています' }, 400);
  }

  const isCross = sender.dept_id !== receiver.dept_id;
  const basePoints = isCross ? 15 : 10;
  const rand = Math.random() * 100;
  let multiplier = 1;
  if (rand < 2) multiplier = 5;
  else if (rand < 10) multiplier = 3;
  else if (rand < 30) multiplier = 2;
  else if (rand < 60) multiplier = 1.5;
  const finalPoints = Math.floor(basePoints * multiplier);

  await db.prepare(`
    INSERT INTO thanks (sender_id, receiver_id, message, points, bonus_multiplier, final_points, is_cross_department)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(sender.id, receiver.id, message, basePoints, multiplier, finalPoints, isCross ? 1 : 0).run();

  await db.prepare(`
    UPDATE users SET daily_seeds = daily_seeds - 1, total_sent_points = total_sent_points + ? WHERE id = ?
  `).bind(finalPoints, sender.id).run();

  await db.prepare(`
    UPDATE users SET total_received_points = total_received_points + ? WHERE id = ?
  `).bind(finalPoints, receiver.id).run();

  await db.prepare(`
    INSERT INTO roblox_events (user_id, roblox_user_id, event_type, payload)
    VALUES (?, ?, 'send_thanks', ?)
  `).bind(sender.id, sender_roblox_id, JSON.stringify({
    receiver_id: receiver.id,
    points: finalPoints,
    multiplier,
  })).run();

  return c.json({
    success: true,
    sender_name: sender.name,
    receiver_name: receiver.name,
    points: finalPoints,
    multiplier,
    cross_department: isCross,
    remaining_seeds: sender.daily_seeds - 1,
  });
});

// Roblox連携状態確認
roblox.get('/status/:userId', async (c) => {
  const db = c.env.DB;
  const userId = c.req.param('userId');

  const user = await db.prepare(`
    SELECT roblox_user_id, roblox_username, roblox_linked_at FROM users WHERE id = ?
  `).bind(userId).first() as any;

  if (!user) {
    return c.json({ error: 'ユーザーが見つかりません' }, 404);
  }

  return c.json({
    linked: !!user.roblox_user_id,
    roblox_user_id: user.roblox_user_id,
    roblox_username: user.roblox_username,
    linked_at: user.roblox_linked_at,
  });
});

export default roblox;
