import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// 管理者認証チェック
async function isAdmin(DB: D1Database, userId: number): Promise<boolean> {
  const admin = await DB.prepare(`
    SELECT * FROM admins WHERE user_id = ?
  `).bind(userId).first();
  return !!admin;
}

// 管理ログを記録
async function logAction(DB: D1Database, adminUserId: number, action: string, targetType: string | null, targetId: number | null, details: string | null) {
  const admin = await DB.prepare(`SELECT id FROM admins WHERE user_id = ?`).bind(adminUserId).first() as any;
  if (admin) {
    await DB.prepare(`
      INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).bind(admin.id, action, targetType, targetId, details).run();
  }
}

// 管理者認証
app.post('/auth', async (c) => {
  const { DB } = c.env;
  const { user_id } = await c.req.json();
  
  try {
    const admin = await DB.prepare(`
      SELECT a.*, u.name as user_name 
      FROM admins a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
    `).bind(user_id).first();
    
    if (!admin) {
      return c.json({ error: '管理者権限がありません', is_admin: false }, 403);
    }
    
    return c.json({ 
      is_admin: true, 
      admin: {
        user_id: (admin as any).user_id,
        user_name: (admin as any).user_name,
        role: (admin as any).role
      }
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    return c.json({ error: '認証エラー' }, 500);
  }
});

// ダッシュボード統計
app.get('/dashboard', async (c) => {
  const { DB } = c.env;
  const adminUserId = parseInt(c.req.query('admin_user_id') || '0');
  
  if (!await isAdmin(DB, adminUserId)) {
    return c.json({ error: '管理者権限がありません' }, 403);
  }
  
  try {
    // 基本統計
    const userCount = await DB.prepare(`SELECT COUNT(*) as count FROM users`).first() as any;
    const deptCount = await DB.prepare(`SELECT COUNT(*) as count FROM departments`).first() as any;
    const thanksCount = await DB.prepare(`SELECT COUNT(*) as count FROM thanks`).first() as any;
    const todayThanks = await DB.prepare(`
      SELECT COUNT(*) as count FROM thanks 
      WHERE date(created_at) = date('now')
    `).first() as any;
    
    // 総ポイント
    const totalPoints = await DB.prepare(`
      SELECT SUM(total_received_points + total_sent_points) as total FROM users
    `).first() as any;
    
    // 最近の感謝（直近10件）
    const recentThanks = await DB.prepare(`
      SELECT 
        t.*,
        s.name as sender_name,
        r.name as receiver_name
      FROM thanks t
      JOIN users s ON t.sender_id = s.id
      JOIN users r ON t.receiver_id = r.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `).all();
    
    return c.json({
      stats: {
        user_count: userCount?.count || 0,
        department_count: deptCount?.count || 0,
        total_thanks: thanksCount?.count || 0,
        today_thanks: todayThanks?.count || 0,
        total_points: totalPoints?.total || 0
      },
      recent_thanks: recentThanks.results
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return c.json({ error: 'ダッシュボード取得エラー' }, 500);
  }
});

// ユーザー一覧
app.get('/users', async (c) => {
  const { DB } = c.env;
  const adminUserId = parseInt(c.req.query('admin_user_id') || '0');
  
  if (!await isAdmin(DB, adminUserId)) {
    return c.json({ error: '管理者権限がありません' }, 403);
  }
  
  try {
    const users = await DB.prepare(`
      SELECT 
        u.*,
        d.name as department_name,
        d.color as department_color,
        (SELECT COUNT(*) FROM thanks WHERE sender_id = u.id) as sent_count,
        (SELECT COUNT(*) FROM thanks WHERE receiver_id = u.id) as received_count
      FROM users u
      JOIN departments d ON u.department_id = d.id
      ORDER BY u.id
    `).all();
    
    return c.json({ users: users.results });
  } catch (error) {
    console.error('Users list error:', error);
    return c.json({ error: 'ユーザー一覧取得エラー' }, 500);
  }
});

// ユーザー追加
app.post('/users', async (c) => {
  const { DB } = c.env;
  const { admin_user_id, name, department_id } = await c.req.json();
  
  if (!await isAdmin(DB, admin_user_id)) {
    return c.json({ error: '管理者権限がありません' }, 403);
  }
  
  if (!name || !department_id) {
    return c.json({ error: '名前と部署は必須です' }, 400);
  }
  
  try {
    const result = await DB.prepare(`
      INSERT INTO users (name, department_id, daily_seeds, total_received_points, total_sent_points, tree_level)
      VALUES (?, ?, 3, 0, 0, 1)
    `).bind(name, department_id).run();
    
    await logAction(DB, admin_user_id, 'CREATE_USER', 'user', result.meta.last_row_id as number, `名前: ${name}`);
    
    return c.json({ 
      success: true, 
      message: 'ユーザーを追加しました',
      user_id: result.meta.last_row_id
    });
  } catch (error) {
    console.error('Create user error:', error);
    return c.json({ error: 'ユーザー追加エラー' }, 500);
  }
});

// ユーザー更新
app.put('/users/:id', async (c) => {
  const { DB } = c.env;
  const userId = parseInt(c.req.param('id'));
  const { admin_user_id, name, department_id } = await c.req.json();
  
  if (!await isAdmin(DB, admin_user_id)) {
    return c.json({ error: '管理者権限がありません' }, 403);
  }
  
  try {
    await DB.prepare(`
      UPDATE users SET name = ?, department_id = ? WHERE id = ?
    `).bind(name, department_id, userId).run();
    
    await logAction(DB, admin_user_id, 'UPDATE_USER', 'user', userId, `名前: ${name}`);
    
    return c.json({ success: true, message: 'ユーザーを更新しました' });
  } catch (error) {
    console.error('Update user error:', error);
    return c.json({ error: 'ユーザー更新エラー' }, 500);
  }
});

// ユーザー削除
app.delete('/users/:id', async (c) => {
  const { DB } = c.env;
  const userId = parseInt(c.req.param('id'));
  const adminUserId = parseInt(c.req.query('admin_user_id') || '0');
  
  if (!await isAdmin(DB, adminUserId)) {
    return c.json({ error: '管理者権限がありません' }, 403);
  }
  
  // 管理者自身は削除不可
  if (userId === adminUserId) {
    return c.json({ error: '自分自身は削除できません' }, 400);
  }
  
  try {
    // ユーザー名を取得
    const user = await DB.prepare(`SELECT name FROM users WHERE id = ?`).bind(userId).first() as any;
    
    // 関連する感謝データも削除
    await DB.prepare(`DELETE FROM thanks WHERE sender_id = ? OR receiver_id = ?`).bind(userId, userId).run();
    await DB.prepare(`DELETE FROM users WHERE id = ?`).bind(userId).run();
    
    await logAction(DB, adminUserId, 'DELETE_USER', 'user', userId, `名前: ${user?.name}`);
    
    return c.json({ success: true, message: 'ユーザーを削除しました' });
  } catch (error) {
    console.error('Delete user error:', error);
    return c.json({ error: 'ユーザー削除エラー' }, 500);
  }
});

// 部署一覧
app.get('/departments', async (c) => {
  const { DB } = c.env;
  const adminUserId = parseInt(c.req.query('admin_user_id') || '0');
  
  if (!await isAdmin(DB, adminUserId)) {
    return c.json({ error: '管理者権限がありません' }, 403);
  }
  
  try {
    const departments = await DB.prepare(`
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM users WHERE department_id = d.id) as member_count
      FROM departments d
      ORDER BY d.id
    `).all();
    
    return c.json({ departments: departments.results });
  } catch (error) {
    console.error('Departments list error:', error);
    return c.json({ error: '部署一覧取得エラー' }, 500);
  }
});

// 部署追加
app.post('/departments', async (c) => {
  const { DB } = c.env;
  const { admin_user_id, name, color } = await c.req.json();
  
  if (!await isAdmin(DB, admin_user_id)) {
    return c.json({ error: '管理者権限がありません' }, 403);
  }
  
  if (!name) {
    return c.json({ error: '部署名は必須です' }, 400);
  }
  
  try {
    const result = await DB.prepare(`
      INSERT INTO departments (name, color) VALUES (?, ?)
    `).bind(name, color || '#10B981').run();
    
    await logAction(DB, admin_user_id, 'CREATE_DEPARTMENT', 'department', result.meta.last_row_id as number, `名前: ${name}`);
    
    return c.json({ 
      success: true, 
      message: '部署を追加しました',
      department_id: result.meta.last_row_id
    });
  } catch (error) {
    console.error('Create department error:', error);
    return c.json({ error: '部署追加エラー' }, 500);
  }
});

// 部署更新
app.put('/departments/:id', async (c) => {
  const { DB } = c.env;
  const deptId = parseInt(c.req.param('id'));
  const { admin_user_id, name, color } = await c.req.json();
  
  if (!await isAdmin(DB, admin_user_id)) {
    return c.json({ error: '管理者権限がありません' }, 403);
  }
  
  try {
    await DB.prepare(`
      UPDATE departments SET name = ?, color = ? WHERE id = ?
    `).bind(name, color, deptId).run();
    
    await logAction(DB, admin_user_id, 'UPDATE_DEPARTMENT', 'department', deptId, `名前: ${name}`);
    
    return c.json({ success: true, message: '部署を更新しました' });
  } catch (error) {
    console.error('Update department error:', error);
    return c.json({ error: '部署更新エラー' }, 500);
  }
});

// 部署削除
app.delete('/departments/:id', async (c) => {
  const { DB } = c.env;
  const deptId = parseInt(c.req.param('id'));
  const adminUserId = parseInt(c.req.query('admin_user_id') || '0');
  
  if (!await isAdmin(DB, adminUserId)) {
    return c.json({ error: '管理者権限がありません' }, 403);
  }
  
  try {
    // 所属ユーザーがいるか確認
    const memberCount = await DB.prepare(`
      SELECT COUNT(*) as count FROM users WHERE department_id = ?
    `).bind(deptId).first() as any;
    
    if (memberCount?.count > 0) {
      return c.json({ error: 'この部署にはまだメンバーがいます。先にメンバーを移動してください。' }, 400);
    }
    
    const dept = await DB.prepare(`SELECT name FROM departments WHERE id = ?`).bind(deptId).first() as any;
    await DB.prepare(`DELETE FROM departments WHERE id = ?`).bind(deptId).run();
    
    await logAction(DB, adminUserId, 'DELETE_DEPARTMENT', 'department', deptId, `名前: ${dept?.name}`);
    
    return c.json({ success: true, message: '部署を削除しました' });
  } catch (error) {
    console.error('Delete department error:', error);
    return c.json({ error: '部署削除エラー' }, 500);
  }
});

// 感謝データ一覧
app.get('/thanks', async (c) => {
  const { DB } = c.env;
  const adminUserId = parseInt(c.req.query('admin_user_id') || '0');
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = parseInt(c.req.query('offset') || '0');
  
  if (!await isAdmin(DB, adminUserId)) {
    return c.json({ error: '管理者権限がありません' }, 403);
  }
  
  try {
    const thanks = await DB.prepare(`
      SELECT 
        t.*,
        s.name as sender_name,
        sd.name as sender_department,
        r.name as receiver_name,
        rd.name as receiver_department
      FROM thanks t
      JOIN users s ON t.sender_id = s.id
      JOIN departments sd ON s.department_id = sd.id
      JOIN users r ON t.receiver_id = r.id
      JOIN departments rd ON r.department_id = rd.id
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    
    const total = await DB.prepare(`SELECT COUNT(*) as count FROM thanks`).first() as any;
    
    return c.json({ 
      thanks: thanks.results,
      total: total?.count || 0
    });
  } catch (error) {
    console.error('Thanks list error:', error);
    return c.json({ error: '感謝データ取得エラー' }, 500);
  }
});

// 感謝削除
app.delete('/thanks/:id', async (c) => {
  const { DB } = c.env;
  const thanksId = parseInt(c.req.param('id'));
  const adminUserId = parseInt(c.req.query('admin_user_id') || '0');
  
  if (!await isAdmin(DB, adminUserId)) {
    return c.json({ error: '管理者権限がありません' }, 403);
  }
  
  try {
    await DB.prepare(`DELETE FROM thanks WHERE id = ?`).bind(thanksId).run();
    await logAction(DB, adminUserId, 'DELETE_THANKS', 'thanks', thanksId, null);
    
    return c.json({ success: true, message: '感謝データを削除しました' });
  } catch (error) {
    console.error('Delete thanks error:', error);
    return c.json({ error: '感謝データ削除エラー' }, 500);
  }
});

// 管理ログ一覧
app.get('/logs', async (c) => {
  const { DB } = c.env;
  const adminUserId = parseInt(c.req.query('admin_user_id') || '0');
  const limit = parseInt(c.req.query('limit') || '50');
  
  if (!await isAdmin(DB, adminUserId)) {
    return c.json({ error: '管理者権限がありません' }, 403);
  }
  
  try {
    const logs = await DB.prepare(`
      SELECT 
        l.*,
        u.name as admin_name
      FROM admin_logs l
      JOIN admins a ON l.admin_id = a.id
      JOIN users u ON a.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT ?
    `).bind(limit).all();
    
    return c.json({ logs: logs.results });
  } catch (error) {
    console.error('Logs error:', error);
    return c.json({ error: 'ログ取得エラー' }, 500);
  }
});

// ポイントリセット（全ユーザー）
// delete_thanks: true の場合、感謝データも削除（ランキングもリセット）
app.post('/reset-points', async (c) => {
  const { DB } = c.env;
  const { admin_user_id, delete_thanks } = await c.req.json();
  
  if (!await isAdmin(DB, admin_user_id)) {
    return c.json({ error: '管理者権限がありません' }, 403);
  }
  
  try {
    // ユーザーの累計ポイントをリセット
    await DB.prepare(`
      UPDATE users SET total_received_points = 0, total_sent_points = 0, tree_level = 1
    `).run();
    
    let message = '全ユーザーのポイントをリセットしました';
    let logDetails = '全ユーザーのポイントをリセット';
    
    // 感謝データも削除する場合
    if (delete_thanks) {
      await DB.prepare(`DELETE FROM thanks`).run();
      
      // 月別統計もリセット
      await DB.prepare(`
        UPDATE monthly_company_tree 
        SET total_thanks_count = 0, total_points = 0, cross_department_count = 0, tree_level = 1
      `).run();
      
      await DB.prepare(`
        UPDATE monthly_department_stats 
        SET thanks_sent = 0, thanks_received = 0, points_sent = 0, points_received = 0, 
            cross_department_sent = 0, branch_level = 0
      `).run();
      
      await DB.prepare(`
        UPDATE garden_state 
        SET garden_level = 1, garden_size = 3, tree_count = 1, flower_beds = 0,
            has_pond = 0, has_fountain = 0, has_gazebo = 0, has_building = 0
      `).run();
      
      message = '全ユーザーのポイントと感謝データをリセットしました（ランキングもリセット）';
      logDetails = '全ユーザーのポイントと感謝データをリセット';
    }
    
    await logAction(DB, admin_user_id, 'RESET_ALL_POINTS', null, null, logDetails);
    
    return c.json({ success: true, message });
  } catch (error) {
    console.error('Reset points error:', error);
    return c.json({ error: 'ポイントリセットエラー' }, 500);
  }
});

// シードリセット（全ユーザー）
app.post('/reset-seeds', async (c) => {
  const { DB } = c.env;
  const { admin_user_id } = await c.req.json();
  
  if (!await isAdmin(DB, admin_user_id)) {
    return c.json({ error: '管理者権限がありません' }, 403);
  }
  
  try {
    await DB.prepare(`
      UPDATE users SET daily_seeds = 3, last_seed_reset = datetime('now')
    `).run();
    
    await logAction(DB, admin_user_id, 'RESET_ALL_SEEDS', null, null, '全ユーザーのシードをリセット');
    
    return c.json({ success: true, message: '全ユーザーのシードをリセットしました' });
  } catch (error) {
    console.error('Reset seeds error:', error);
    return c.json({ error: 'シードリセットエラー' }, 500);
  }
});

export default app;
