import { Hono } from 'hono';
import type { Bindings } from '../types';

const rankings = new Hono<{ Bindings: Bindings }>();

// 日本時間の現在年月を取得
function getJSTYearMonth(): string {
  const now = new Date();
  const jstOffset = 9 * 60; // UTC+9
  const jstTime = new Date(now.getTime() + jstOffset * 60 * 1000);
  const year = jstTime.getUTCFullYear();
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// 個人ランキング（累計ポイント）
rankings.get('/individual', async (c) => {
  const db = c.env.DB;
  const limit = parseInt(c.req.query('limit') || '10');
  
  const result = await db.prepare(`
    SELECT 
      u.id as user_id,
      u.name as user_name,
      d.name as department_name,
      d.color as department_color,
      (u.total_received_points + u.total_sent_points) as total_points
    FROM users u
    JOIN departments d ON u.department_id = d.id
    ORDER BY total_points DESC
    LIMIT ?
  `).bind(limit).all();
  
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
  
  const result = await db.prepare(`
    SELECT 
      d.id as department_id,
      d.name as department_name,
      d.color as department_color,
      COUNT(u.id) as member_count,
      COALESCE(SUM(u.total_received_points + u.total_sent_points), 0) as total_points
    FROM departments d
    LEFT JOIN users u ON u.department_id = d.id
    GROUP BY d.id
    ORDER BY total_points DESC
  `).all();
  
  // 平均ポイント計算とランク付け
  const ranking = result.results.map((r: any, index: number) => ({
    ...r,
    avg_points: r.member_count > 0 ? Math.round((r.total_points / r.member_count) * 100) / 100 : 0,
    rank: index + 1
  }));
  
  return c.json({ ranking });
});

export default rankings;
