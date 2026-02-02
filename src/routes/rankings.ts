import { Hono } from 'hono';
import type { Bindings } from '../types';

const rankings = new Hono<{ Bindings: Bindings }>();

// 日本時間の現在年月を取得
function getJSTYearMonth(): string {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // UTC+9
  const jstTime = new Date(now.getTime() + jstOffset);
  const year = jstTime.getUTCFullYear();
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// 個人ランキング（今月のポイント - 送信+受信）
rankings.get('/individual', async (c) => {
  const db = c.env.DB;
  const limit = parseInt(c.req.query('limit') || '10');
  const yearMonth = getJSTYearMonth();
  
  // 今月の送信ポイントと受信ポイントを集計
  const result = await db.prepare(`
    SELECT 
      u.id as user_id,
      u.name as user_name,
      d.name as department_name,
      d.color as department_color,
      COALESCE(sent.sent_points, 0) + COALESCE(received.received_points, 0) as total_points
    FROM users u
    JOIN departments d ON u.department_id = d.id
    LEFT JOIN (
      SELECT sender_id, SUM(final_points) as sent_points
      FROM thanks
      WHERE strftime('%Y-%m', created_at) = ?
      GROUP BY sender_id
    ) sent ON u.id = sent.sender_id
    LEFT JOIN (
      SELECT receiver_id, SUM(final_points) as received_points
      FROM thanks
      WHERE strftime('%Y-%m', created_at) = ?
      GROUP BY receiver_id
    ) received ON u.id = received.receiver_id
    WHERE COALESCE(sent.sent_points, 0) + COALESCE(received.received_points, 0) > 0
    ORDER BY total_points DESC
    LIMIT ?
  `).bind(yearMonth, yearMonth, limit).all();
  
  // ランク付け
  const ranking = result.results.map((r: any, index: number) => ({
    ...r,
    rank: index + 1
  }));
  
  return c.json({ ranking, year_month: yearMonth });
});

// 部署ランキング（今月の平均ポイント順）
rankings.get('/department', async (c) => {
  const db = c.env.DB;
  const yearMonth = getJSTYearMonth();
  
  // 今月の部署別ポイントを集計
  const result = await db.prepare(`
    SELECT 
      d.id as department_id,
      d.name as department_name,
      d.color as department_color,
      (SELECT COUNT(*) FROM users WHERE department_id = d.id) as member_count,
      COALESCE(sent.sent_points, 0) + COALESCE(received.received_points, 0) as total_points
    FROM departments d
    LEFT JOIN (
      SELECT u.department_id, SUM(t.final_points) as sent_points
      FROM thanks t
      JOIN users u ON t.sender_id = u.id
      WHERE strftime('%Y-%m', t.created_at) = ?
      GROUP BY u.department_id
    ) sent ON d.id = sent.department_id
    LEFT JOIN (
      SELECT u.department_id, SUM(t.final_points) as received_points
      FROM thanks t
      JOIN users u ON t.receiver_id = u.id
      WHERE strftime('%Y-%m', t.created_at) = ?
      GROUP BY u.department_id
    ) received ON d.id = received.department_id
  `).bind(yearMonth, yearMonth).all();
  
  // 平均ポイント計算
  const withAvg = result.results.map((r: any) => ({
    ...r,
    avg_points: r.member_count > 0 ? Math.round((r.total_points / r.member_count) * 100) / 100 : 0
  }));
  
  // 平均ポイント順でソートしてランク付け
  const ranking = withAvg
    .sort((a: any, b: any) => b.avg_points - a.avg_points)
    .map((r: any, index: number) => ({
      ...r,
      rank: index + 1
    }));
  
  return c.json({ ranking, year_month: yearMonth });
});

export default rankings;
