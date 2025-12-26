import { Hono } from 'hono';
import type { Bindings } from '../types';

const users = new Hono<{ Bindings: Bindings }>();

// 日本時間で現在の日付を取得
function getJSTDate(): string {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(now.getTime() + jstOffset);
  return jstDate.toISOString().slice(0, 10);
}

// 日本時間で現在の年月を取得
function getJSTYearMonth(): string {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(now.getTime() + jstOffset);
  const year = jstDate.getUTCFullYear();
  const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// 全ユーザー取得（月間ポイント付き）
users.get('/', async (c) => {
  const db = c.env.DB;
  const yearMonth = getJSTYearMonth();
  
  const result = await db.prepare(`
    SELECT 
      u.*,
      d.name as department_name,
      d.color as department_color,
      COALESCE(
        (SELECT SUM(final_points) 
         FROM thanks 
         WHERE receiver_id = u.id 
         AND strftime('%Y-%m', created_at) = ?
        ), 0
      ) as points
    FROM users u
    JOIN departments d ON u.department_id = d.id
    ORDER BY points DESC, u.name
  `).bind(yearMonth).all();
  
  return c.json({ users: result.results });
});

// 特定ユーザー取得
users.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  
  const result = await db.prepare(`
    SELECT u.*, d.name as department_name, d.color as department_color
    FROM users u
    JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).bind(id).first();
  
  if (!result) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  return c.json({ user: result });
});

// 種のリセット（毎日・日本時間基準）
users.post('/:id/reset-seeds', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first() as any;
  
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  const todayJST = getJSTDate();
  const lastReset = user.last_seed_reset ? user.last_seed_reset.slice(0, 10) : null;
  
  // 日本時間で日付が変わっていたらシードをリセット
  if (lastReset !== todayJST) {
    await db.prepare(`
      UPDATE users 
      SET daily_seeds = 3, last_seed_reset = ? 
      WHERE id = ?
    `).bind(todayJST, id).run();
    
    return c.json({ success: true, reset: true, seeds: 3 });
  }
  
  return c.json({ success: true, reset: false, seeds: user.daily_seeds });
});

// ツリー更新
users.post('/:id/update-tree', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first() as any;
  
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  const totalPoints = (user.total_received_points || 0) + (user.total_sent_points || 0);
  const levels = [0, 10, 30, 50, 70, 100, 150, 200, 300, 500];
  let newLevel = 1;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalPoints >= levels[i]) {
      newLevel = i + 1;
      break;
    }
  }
  
  if (newLevel !== user.tree_level) {
    await db.prepare('UPDATE users SET tree_level = ? WHERE id = ?')
      .bind(newLevel, id).run();
  }
  
  return c.json({ success: true, level: newLevel });
});

export default users;
