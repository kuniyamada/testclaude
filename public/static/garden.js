// Thanks Garden - 6段階庭成長システム

const GARDEN_STAGES = {
  1: {
    name: 'Sprouts',
    japaneseName: '芽生えの庭',
    image: '/static/garden-stage1.png',
    description: '🌱 小さな芽が出てきました！感謝を送って庭を育てよう',
    emoji: '🌱',
    color: '#A5D6A7'
  },
  2: {
    name: 'Seedlings',
    japaneseName: '苗木の庭',
    image: '/static/garden-stage2.png',
    description: '🍄 きのこが生えてきた！色とりどりの植物が増えてきたよ',
    emoji: '🍄',
    color: '#81C784'
  },
  3: {
    name: 'Bloom',
    japaneseName: '花咲く庭',
    image: '/static/garden-stage3.png',
    description: '🌸 花が咲き始めた！きのこも大きく育ってきた',
    emoji: '🌸',
    color: '#66BB6A'
  },
  4: {
    name: 'Flourish',
    japaneseName: '繁栄の庭',
    image: '/static/garden-stage4.png',
    description: '💧 池ができた！色とりどりのきのこが輝いている',
    emoji: '✨',
    color: '#4CAF50'
  },
  5: {
    name: 'Enchantment',
    japaneseName: '魔法の庭',
    image: '/static/garden-stage5.png',
    description: '🏠 かわいいお家ができた！蝶々も遊びに来たよ',
    emoji: '🦋',
    color: '#43A047'
  },
  6: {
    name: 'Magic Grove',
    japaneseName: '魔法の森',
    image: '/static/garden-stage6.png',
    description: '🎉 完璧な庭園が完成！みんなの感謝で育った最高の庭！',
    emoji: '🎊',
    color: '#388E3C'
  }
};

// 感謝数からステージを計算
function calculateStage(totalThanks) {
  if (totalThanks < 10) return 1;
  if (totalThanks < 30) return 2;
  if (totalThanks < 60) return 3;
  if (totalThanks < 100) return 4;
  if (totalThanks < 150) return 5;
  return 6;
}

// 進捗情報を取得
function getProgressInfo(totalThanks) {
  const stage = calculateStage(totalThanks);
  const thresholds = [0, 10, 30, 60, 100, 150];
  
  if (stage === 6) {
    return {
      stage,
      progress: 100,
      current: totalThanks,
      nextTarget: 150,
      remaining: 0,
      isComplete: true
    };
  }
  
  const currentThreshold = thresholds[stage - 1];
  const nextThreshold = thresholds[stage];
  const progress = ((totalThanks - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  
  return {
    stage,
    progress: Math.min(100, Math.max(0, progress)),
    current: totalThanks,
    nextTarget: nextThreshold,
    remaining: nextThreshold - totalThanks,
    isComplete: false
  };
}

// 庭をレンダリング
function renderGarden(gardenData) {
  const state = gardenData.state;
  const totalThanks = state.total_thanks_count || 0;
  const progressInfo = getProgressInfo(totalThanks);
  const stageInfo = GARDEN_STAGES[progressInfo.stage];
  
  // レスポンシブサイズ計算
  const isMobile = window.innerWidth < 640;
  const containerSize = isMobile ? Math.min(window.innerWidth - 40, 320) : 400;
  
  return `
    <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
      <!-- 庭のメインコンテナ -->
      <div style="
        position: relative;
        width: ${containerSize}px;
        max-width: 100%;
        border: 4px solid ${stageInfo.color};
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        margin: 0 auto;
      ">
        <!-- ステージバッジ -->
        <div style="
          position: absolute;
          top: 10px;
          left: 10px;
          background: linear-gradient(135deg, ${stageInfo.color}, ${stageInfo.color}dd);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: ${isMobile ? '12px' : '14px'};
          font-weight: bold;
          z-index: 10;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        ">
          ${stageInfo.emoji} Stage ${progressInfo.stage}
        </div>
        
        <!-- 進捗バッジ -->
        <div style="
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255,255,255,0.95);
          color: ${stageInfo.color};
          padding: 6px 12px;
          border-radius: 20px;
          font-size: ${isMobile ? '12px' : '14px'};
          font-weight: bold;
          z-index: 10;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        ">
          ${progressInfo.isComplete ? '🎉 完成！' : `${Math.round(progressInfo.progress)}%`}
        </div>
        
        <!-- 庭の画像 -->
        <img 
          src="${stageInfo.image}" 
          alt="${stageInfo.japaneseName}"
          style="
            width: 100%;
            height: auto;
            display: block;
          "
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
        >
        <div style="
          display: none;
          width: 100%;
          aspect-ratio: 1;
          align-items: center;
          justify-content: center;
          font-size: 80px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        ">
          ${stageInfo.emoji}
        </div>
        
        <!-- ステージ名 -->
        <div style="
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.6));
          color: white;
          padding: 20px 15px 15px;
          text-align: center;
        ">
          <div style="font-size: ${isMobile ? '16px' : '18px'}; font-weight: bold;">
            ${stageInfo.japaneseName}
          </div>
          <div style="font-size: ${isMobile ? '11px' : '12px'}; opacity: 0.9;">
            ${stageInfo.name}
          </div>
        </div>
      </div>
      
      <!-- 説明と統計 -->
      <div style="
        width: 100%;
        max-width: ${containerSize}px;
        margin-top: 16px;
        text-align: center;
      ">
        <!-- 説明文 -->
        <p style="
          color: #166534;
          font-size: ${isMobile ? '13px' : '14px'};
          margin-bottom: 12px;
          padding: 0 10px;
        ">
          ${stageInfo.description}
        </p>
        
        <!-- 感謝の回数 -->
        <div style="
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 2px solid ${stageInfo.color};
          border-radius: 15px;
          padding: 12px 20px;
          margin-bottom: 16px;
        ">
          <span style="color: #166534; font-size: ${isMobile ? '13px' : '14px'};">感謝の回数: </span>
          <span style="color: ${stageInfo.color}; font-size: ${isMobile ? '20px' : '24px'}; font-weight: bold;">${totalThanks}</span>
          <span style="color: #166534; font-size: ${isMobile ? '13px' : '14px'};"> 回</span>
        </div>
        
        <!-- 進捗バー（完成していない場合） -->
        ${!progressInfo.isComplete ? `
          <div style="
            background: #e5e7eb;
            border-radius: 10px;
            height: 8px;
            margin-bottom: 8px;
            overflow: hidden;
          ">
            <div style="
              background: linear-gradient(90deg, ${stageInfo.color}, ${GARDEN_STAGES[Math.min(6, progressInfo.stage + 1)].color});
              height: 100%;
              width: ${progressInfo.progress}%;
              border-radius: 10px;
              transition: width 0.5s ease;
            "></div>
          </div>
          <p style="color: #6b7280; font-size: ${isMobile ? '11px' : '12px'};">
            次のステージまであと ${progressInfo.remaining} 回
          </p>
        ` : `
          <p style="color: ${stageInfo.color}; font-size: ${isMobile ? '14px' : '16px'}; font-weight: bold;">
            ✨ すべてのステージをクリア！ ✨
          </p>
        `}
        
        <!-- ステージインジケーター -->
        <div style="
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
        ">
          ${[1,2,3,4,5,6].map(s => `
            <div style="
              width: ${isMobile ? '32px' : '40px'};
              height: ${isMobile ? '32px' : '40px'};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${isMobile ? '14px' : '16px'};
              background: ${s <= progressInfo.stage ? GARDEN_STAGES[s].color : '#e5e7eb'};
              color: ${s <= progressInfo.stage ? 'white' : '#9ca3af'};
              transition: all 0.3s ease;
              ${s === progressInfo.stage ? 'transform: scale(1.15); box-shadow: 0 4px 12px rgba(0,0,0,0.2);' : ''}
            ">
              ${GARDEN_STAGES[s].emoji}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
