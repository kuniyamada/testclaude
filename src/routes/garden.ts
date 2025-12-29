import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// 日本時間で現在の年月を取得
function getCurrentYearMonth(): string {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(now.getTime() + jstOffset);
  const year = jstDate.getUTCFullYear();
  const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// 庭の状態取得
app.get('/state', async (c) => {
  const { DB } = c.env;
  const yearMonth = getCurrentYearMonth();
  
  return getGardenState(c, DB, yearMonth);
});

// 指定月の庭の状態取得
app.get('/state/:yearMonth', async (c) => {
  const { DB } = c.env;
  const yearMonth = c.req.param('yearMonth');
  
  return getGardenState(c, DB, yearMonth);
});

async function getGardenState(c: any, DB: D1Database, yearMonth: string) {
  try {
    // 庭の状態を取得
    let state = await DB.prepare(`
      SELECT * FROM garden_state WHERE year_month = ?
    `).bind(yearMonth).first();
    
    if (!state) {
      // 新しい月の庭を作成
      await DB.prepare(`
        INSERT INTO garden_state (year_month, garden_level, garden_size, tree_count, flower_beds, mushroom_count, has_pond, has_fountain, has_gazebo, has_building, residents_count, wildlife_count, total_thanks_count)
        VALUES (?, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
      `).bind(yearMonth).run();
      
      state = await DB.prepare(`
        SELECT * FROM garden_state WHERE year_month = ?
      `).bind(yearMonth).first();
    }
    
    // 庭の要素を取得（テーブルが存在しない場合は空配列）
    let elements: any[] = [];
    try {
      const elementsResult = await DB.prepare(`
        SELECT * FROM garden_elements WHERE year_month = ?
      `).bind(yearMonth).all();
      elements = elementsResult.results as any[];
    } catch (elemError) {
      console.log('garden_elements table not available');
    }
    
    // 住人を取得（ポイント上位5人）- total_received_points + total_sent_points を使用
    const residents = await DB.prepare(`
      SELECT 
        u.id, u.name, 
        (u.total_received_points + u.total_sent_points) as total_points,
        d.name as department_name,
        d.color as department_color
      FROM users u
      JOIN departments d ON u.department_id = d.id
      ORDER BY (u.total_received_points + u.total_sent_points) DESC
      LIMIT 5
    `).all();
    
    return c.json({
      state,
      elements,
      residents: residents.results
    });
  } catch (error) {
    console.error('Failed to get garden state:', error);
    return c.json({ error: 'Failed to get garden state' }, 500);
  }
}

// 庭の更新（感謝送信後）
app.post('/update', async (c) => {
  const { DB } = c.env;
  const yearMonth = getCurrentYearMonth();
  
  try {
    // 現在の感謝総数を取得
    const thanksResult = await DB.prepare(`
      SELECT COUNT(*) as count FROM thanks 
      WHERE strftime('%Y-%m', created_at) = ?
    `).bind(yearMonth).first() as { count: number };
    
    const totalThanks = thanksResult?.count || 0;
    
    // 感謝数に基づいてレベルを計算
    let gardenLevel = 1;
    let gardenSize = 3;
    let treeCount = 0;
    let flowerBeds = 0;
    let mushroomCount = 0;
    let hasPond = 0;
    let hasFountain = 0;
    let hasGazebo = 0;
    let hasBuilding = 0;
    
    if (totalThanks >= 150) {
      gardenLevel = 6; gardenSize = 13;
      treeCount = 8; flowerBeds = 6; mushroomCount = 10;
      hasPond = 1; hasFountain = 1; hasGazebo = 1; hasBuilding = 1;
    } else if (totalThanks >= 100) {
      gardenLevel = 5; gardenSize = 11;
      treeCount = 6; flowerBeds = 5; mushroomCount = 8;
      hasPond = 1; hasFountain = 1; hasGazebo = 1;
    } else if (totalThanks >= 60) {
      gardenLevel = 4; gardenSize = 9;
      treeCount = 4; flowerBeds = 4; mushroomCount = 6;
      hasPond = 1; hasFountain = 1;
    } else if (totalThanks >= 30) {
      gardenLevel = 3; gardenSize = 7;
      treeCount = 3; flowerBeds = 3; mushroomCount = 4;
      hasPond = 1;
    } else if (totalThanks >= 10) {
      gardenLevel = 2; gardenSize = 5;
      treeCount = 2; flowerBeds = 2; mushroomCount = 2;
    } else {
      gardenLevel = 1; gardenSize = 3;
      treeCount = 1; flowerBeds = 0; mushroomCount = 0;
    }
    
    // 庭の状態を更新（total_thanks_countカラムがない場合に備えて）
    try {
      await DB.prepare(`
        UPDATE garden_state 
        SET garden_level = ?,
            garden_size = ?,
            tree_count = ?,
            flower_beds = ?,
            mushroom_count = ?,
            has_pond = ?,
            has_fountain = ?,
            has_gazebo = ?,
            has_building = ?,
            updated_at = datetime('now')
        WHERE year_month = ?
      `).bind(
        gardenLevel, gardenSize, treeCount, flowerBeds, mushroomCount,
        hasPond, hasFountain, hasGazebo, hasBuilding, yearMonth
      ).run();
    } catch (updateError) {
      console.error('Garden update error:', updateError);
    }
    
    return c.json({ 
      message: '庭を更新しました',
      garden_level: gardenLevel,
      garden_size: gardenSize,
      tree_count: treeCount,
      flower_beds: flowerBeds,
      mushroom_count: mushroomCount,
      total_thanks_count: totalThanks
    });
  } catch (error) {
    console.error('Failed to update garden:', error);
    return c.json({ error: 'Failed to update garden' }, 500);
  }
});

export default app;
