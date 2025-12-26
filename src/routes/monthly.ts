import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// 月一覧取得
app.get('/list', async (c) => {
  const { DB } = c.env;
  
  try {
    const result = await DB.prepare(`
      SELECT year_month, total_thanks_count, total_points, cross_department_count, tree_level, created_at
      FROM monthly_company_tree
      ORDER BY year_month DESC
    `).all();
    
    return c.json({ months: result.results });
  } catch (error) {
    console.error('Failed to get month list:', error);
    return c.json({ error: 'Failed to get month list' }, 500);
  }
});

// 月別レポート取得
app.get('/report/:yearMonth', async (c) => {
  const { DB } = c.env;
  const yearMonth = c.req.param('yearMonth');
  
  try {
    // 月別ツリー情報
    const tree = await DB.prepare(`
      SELECT * FROM monthly_company_tree WHERE year_month = ?
    `).bind(yearMonth).first();
    
    if (!tree) {
      return c.json({ error: 'Data not found for this month' }, 404);
    }
    
    // 部署別統計
    const deptStats = await DB.prepare(`
      SELECT 
        mds.*,
        d.name as department_name,
        d.color as department_color
      FROM monthly_department_stats mds
      JOIN departments d ON mds.department_id = d.id
      WHERE mds.year_month = ?
      ORDER BY mds.points_sent + mds.points_received DESC
    `).bind(yearMonth).all();
    
    // トップ個人ランキング
    const topIndividuals = await DB.prepare(`
      SELECT 
        u.id, u.name, u.total_points,
        d.name as department_name,
        d.color as department_color
      FROM users u
      JOIN departments d ON u.department_id = d.id
      ORDER BY u.total_points DESC
      LIMIT 10
    `).all();
    
    // ブリッジ情報
    const bridges = await DB.prepare(`
      SELECT 
        db.*,
        d1.name as from_department_name,
        d1.color as from_department_color,
        d2.name as to_department_name,
        d2.color as to_department_color
      FROM department_bridges db
      JOIN departments d1 ON db.from_department_id = d1.id
      JOIN departments d2 ON db.to_department_id = d2.id
      WHERE db.year_month = ?
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
      branch_level: stat.branch_level
    }));
    
    return c.json({
      tree,
      departments,
      top_individuals: topIndividuals.results,
      bridges: bridges.results
    });
  } catch (error) {
    console.error('Failed to get monthly report:', error);
    return c.json({ error: 'Failed to get monthly report' }, 500);
  }
});

export default app;
