import { Hono } from 'hono';
import type { Bindings } from '../types';

const rankings = new Hono<{ Bindings: Bindings }>();

// 個人ランキング（月間ポイント）
rankings.get('/individual', async (c) => {
  const db = c.env.DB;
  const limit = parseInt(c.req.query('limit') || '10');
  const yearMonth = new Date().toISOString().slice(0, 7);
  
  const result = await db.prepare(`
    SELECT 
      u.id as user_id,
      u.name as user_name,
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
    ORDER BY points DESC
    LIMIT ?
  `).bind(yearMonth, limit).all();
  
  // ランク付け
  const ranking = result.results.map((r: any, index: number) => ({
    ...r,
    rank: index + 1
  }));
  
  return c.json({ ranking });
});

// 部署ランキング（1人あたり平均ポイント）
rankings.get('/department', async (c) => {
  const db = c.env.DB;
  const yearMonth = new Date().toISOString().slice(0, 7);
  
  const result = await db.prepare(`
    SELECT 
      d.id as department_id,
      d.name as department_name,
      d.color as department_color,
      COUNT(u.id) as member_count,
      COALESCE(SUM(
        (SELECT SUM(points) 
         FROM thanks 
         WHERE receiver_id = u.id 
         AND strftime('%Y-%m', created_at) = ?
        )
      ), 0) as total_points
    FROM departments d
    LEFT JOIN users u ON u.department_id = d.id
    GROUP BY d.id
    ORDER BY total_points DESC
  `).bind(yearMonth).all();
  
  // 平均ポイント計算とランク付け
  const ranking = result.results.map((r: any, index: number) => ({
    ...r,
    avg_points: r.member_count > 0 ? r.total_points / r.member_count : 0,
    rank: index + 1
  }));
  
  return c.json({ ranking });
});

export default rankings;
