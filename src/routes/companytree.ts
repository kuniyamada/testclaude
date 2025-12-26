import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// 日本時間で現在の年月を取得
function getCurrentYearMonth(): string {
  const now = new Date();
  // JSTオフセット（+9時間）
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(now.getTime() + jstOffset);
  const year = jstDate.getUTCFullYear();
  const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// 現在月のカンパニーツリー取得
app.get('/current', async (c) => {
  const { DB } = c.env;
  const yearMonth = getCurrentYearMonth();
  
  try {
    // 月別ツリーを取得または作成
    let tree = await DB.prepare(`
      SELECT * FROM monthly_company_tree WHERE year_month = ?
    `).bind(yearMonth).first();
    
    if (!tree) {
      // 新しい月のデータを作成
      await DB.prepare(`
        INSERT INTO monthly_company_tree (year_month, tree_level, total_thanks_count, total_points, cross_department_count)
        VALUES (?, 1, 0, 0, 0)
      `).bind(yearMonth).run();
      
      tree = await DB.prepare(`
        SELECT * FROM monthly_company_tree WHERE year_month = ?
      `).bind(yearMonth).first();
      
      // 部署統計も初期化
      const departments = await DB.prepare(`SELECT id FROM departments`).all();
      for (const dept of departments.results as any[]) {
        await DB.prepare(`
          INSERT OR IGNORE INTO monthly_department_stats 
          (year_month, department_id, thanks_sent, thanks_received, points_sent, points_received, cross_department_sent, branch_level)
          VALUES (?, ?, 0, 0, 0, 0, 0, 0)
        `).bind(yearMonth, dept.id).run();
      }
    }
    
    // 部署別統計を取得
    const deptStats = await DB.prepare(`
      SELECT 
        mds.*,
        d.name as department_name,
        d.color as department_color
      FROM monthly_department_stats mds
      JOIN departments d ON mds.department_id = d.id
      WHERE mds.year_month = ?
    `).bind(yearMonth).all();
    
    // ブリッジ情報を取得
    const bridges = await DB.prepare(`
      SELECT * FROM department_bridges WHERE year_month = ?
    `).bind(yearMonth).all();
    
    const departments = (deptStats.results as any[]).map(stat => ({
      id: stat.department_id,
      name: stat.department_name,
      color: stat.department_color,
      thanks_sent: stat.thanks_sent,
      thanks_received: stat.thanks_received,
      points_sent: stat.points_sent,
      points_received: stat.points_received,
      cross_department_sent: stat.cross_department_sent,
      branch_level: stat.branch_level,
      updated_at: stat.updated_at
    }));
    
    return c.json({
      tree,
      departments,
      bridges: bridges.results
    });
  } catch (error) {
    console.error('Failed to get company tree:', error);
    return c.json({ error: 'Failed to get company tree' }, 500);
  }
});

// 統計更新（感謝送信後に呼ばれる）
app.post('/update-stats', async (c) => {
  const { DB } = c.env;
  const yearMonth = getCurrentYearMonth();
  
  try {
    const body = await c.req.json();
    const { sender_department_id, receiver_department_id, points, is_cross_department } = body;
    
    // 送信部署の統計更新
    await DB.prepare(`
      UPDATE monthly_department_stats 
      SET thanks_sent = thanks_sent + 1,
          points_sent = points_sent + ?,
          cross_department_sent = cross_department_sent + ?,
          updated_at = datetime('now')
      WHERE year_month = ? AND department_id = ?
    `).bind(points, is_cross_department ? 1 : 0, yearMonth, sender_department_id).run();
    
    // 受信部署の統計更新
    await DB.prepare(`
      UPDATE monthly_department_stats 
      SET thanks_received = thanks_received + 1,
          points_received = points_received + ?,
          updated_at = datetime('now')
      WHERE year_month = ? AND department_id = ?
    `).bind(points, yearMonth, receiver_department_id).run();
    
    // カンパニーツリー全体の統計更新
    await DB.prepare(`
      UPDATE monthly_company_tree 
      SET total_thanks_count = total_thanks_count + 1,
          total_points = total_points + ?,
          cross_department_count = cross_department_count + ?,
          updated_at = datetime('now')
      WHERE year_month = ?
    `).bind(points, is_cross_department ? 1 : 0, yearMonth).run();
    
    // 部署間ブリッジの更新（部署横断の場合）
    if (is_cross_department) {
      const fromDept = Math.min(sender_department_id, receiver_department_id);
      const toDept = Math.max(sender_department_id, receiver_department_id);
      
      const existingBridge = await DB.prepare(`
        SELECT * FROM department_bridges 
        WHERE year_month = ? AND from_department_id = ? AND to_department_id = ?
      `).bind(yearMonth, fromDept, toDept).first();
      
      if (existingBridge) {
        await DB.prepare(`
          UPDATE department_bridges 
          SET thanks_count = thanks_count + 1,
              updated_at = datetime('now')
          WHERE year_month = ? AND from_department_id = ? AND to_department_id = ?
        `).bind(yearMonth, fromDept, toDept).run();
      } else {
        await DB.prepare(`
          INSERT INTO department_bridges (year_month, from_department_id, to_department_id, thanks_count)
          VALUES (?, ?, ?, 1)
        `).bind(yearMonth, fromDept, toDept).run();
      }
    }
    
    return c.json({ message: '統計を更新しました' });
  } catch (error) {
    console.error('Failed to update stats:', error);
    return c.json({ error: 'Failed to update stats' }, 500);
  }
});

export default app;
