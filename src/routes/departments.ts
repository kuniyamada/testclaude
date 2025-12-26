import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// 部署一覧取得
app.get('/', async (c) => {
  const { DB } = c.env;
  
  try {
    const result = await DB.prepare(`
      SELECT id, name, color
      FROM departments
      ORDER BY id
    `).all();
    
    return c.json({ departments: result.results });
  } catch (error) {
    console.error('Failed to get departments:', error);
    return c.json({ error: 'Failed to get departments' }, 500);
  }
});

// 部署詳細取得
app.get('/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  
  try {
    const department = await DB.prepare(`
      SELECT id, name, color
      FROM departments
      WHERE id = ?
    `).bind(id).first();
    
    if (!department) {
      return c.json({ error: 'Department not found' }, 404);
    }
    
    // 部署のユーザー一覧を取得
    const users = await DB.prepare(`
      SELECT id, name, department_id, daily_seeds, total_points, tree_level
      FROM users
      WHERE department_id = ?
      ORDER BY name
    `).bind(id).all();
    
    return c.json({ 
      department,
      users: users.results
    });
  } catch (error) {
    console.error('Failed to get department:', error);
    return c.json({ error: 'Failed to get department' }, 500);
  }
});

export default app;
