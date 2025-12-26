import { Hono } from 'hono';
import type { Bindings } from '../types';

const users = new Hono<{ Bindings: Bindings }>();

// 全ユーザー取得（月間ポイント付き）
users.get('/', async (c) => {
  const db = c.env.DB;
  const yearMonth = new Date().toISOString().slice(0, 7);
  
  const result = await db.prepare(`
    SELECT 
      u.*,
      d.name as department_name,
      d.color as department_color,
      COALESCE(
        (SELECT SUM(points) 
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

// 種のリセット（毎日）
users.post('/:id/reset-seeds', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first() as any;
  
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  const today = new Date().toISOString().slice(0, 10);
  const lastReset = user.last_seed_reset ? user.last_seed_reset.slice(0, 10) : null;
  
  if (lastReset !== today) {
    await db.prepare(`
      UPDATE users 
      SET daily_seeds = 3, last_seed_reset = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(id).run();
  }
  
  return c.json({ success: true });
});

// ツリー更新
users.post('/:id/update-tree', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first() as any;
  
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  const levels = [0, 10, 30, 50, 70, 100, 150, 200, 300, 500];
  let newLevel = 1;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (user.total_received_points >= levels[i]) {
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
