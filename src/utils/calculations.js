// 推荐算法计算工具
import { 
  getHeroWinRate, 
  getCounterRate, 
  getSynergyRate,
  normalizeProficiencyScores 
} from '../services/dataProcessor';

// 权重配置
const WEIGHTS = {
  WITH_PLAYER: {
    versionWinRate: 0.35,
    counterRelation: 0.4,
    synergyRelation: 0.15,
    playerProficiency: 0.1
  },
  WITHOUT_PLAYER: {
    versionWinRate: 0.4,
    counterRelation: 0.6
  }
};

// 计算版本胜率得分（0-100）
const calculateVersionWinRateScore = (heroName, processedData) => {
  const winRate = getHeroWinRate(heroName, processedData);
  return winRate * 100;
};

// 计算克制关系得分（0-100）
const calculateCounterScore = (heroName, enemyHeroes, processedData) => {
  if (enemyHeroes.length === 0) return 50;
  
  let totalCounterRate = 0;
  let validCounters = 0;
  
  enemyHeroes.forEach(enemy => {
    const counterRate = getCounterRate(heroName, enemy.name, processedData);
    console.log(`${heroName} vs ${enemy.name}: ${counterRate}`);
    
    // 只要有返回值就计算，即使是0.5也是有效数据
    totalCounterRate += counterRate;
    validCounters++;
  });
  
  // 计算平均克制率
  const avgCounterRate = validCounters > 0 ? totalCounterRate / validCounters : 0.5;
  return avgCounterRate * 100;
};

// 计算配合关系得分（0-100）
const calculateSynergyScore = (heroName, allyHeroes, playerData, processedData) => {
  if (allyHeroes.length === 0) return 50;
  
  // 如果没有玩家数据，使用默认的配合关系计算
  if (!playerData) {
    // 基于英雄类型的简单配合关系
    const heroData = processedData[heroName];
    if (!heroData) return 50;
    
    let synergyScore = 50;
    allyHeroes.forEach(ally => {
      const allyData = processedData[ally.name];
      if (allyData) {
        // 简单的配合关系：相同类型的英雄配合度略高
        const heroType = getHeroTypeFromData(heroName, processedData);
        const allyType = getHeroTypeFromData(ally.name, processedData);
        
        if (heroType === allyType) {
          synergyScore += 2; // 同类型英雄配合度+2
        } else {
          synergyScore += 1; // 不同类型英雄配合度+1
        }
      }
    });
    
    return Math.min(100, synergyScore);
  }
  
  // 如果有玩家数据，使用更复杂的配合关系计算
  let totalSynergyRate = 0;
  allyHeroes.forEach(ally => {
    const synergyRate = getSynergyRate(heroName, ally.name, playerData, processedData);
    totalSynergyRate += synergyRate;
  });
  
  return (totalSynergyRate / allyHeroes.length) * 100;
};

// 获取英雄类型的辅助函数
const getHeroTypeFromData = (heroName, processedData) => {
  // 从英雄数据中获取类型信息
  const heroData = processedData[heroName];
  if (heroData && heroData.type) {
    return heroData.type;
  }
  
  // 如果没有类型信息，返回默认值
  return 'unknown';
};

// 计算玩家熟练度得分（0-100）
const calculateProficiencyScore = (heroName, normalizedProficiency, processedData) => {
  if (!normalizedProficiency || !processedData[heroName]) {
    return 0;
  }
  
  const heroId = processedData[heroName].id;
  const profData = normalizedProficiency[heroId];
  
  return profData ? profData.normalizedScore : 0;
};

// 计算单个英雄的推荐分数
export const calculateHeroScore = (
  heroName,
  allyHeroes,
  enemyHeroes,
  playerData,
  processedData,
  hasPlayer = false
) => {
  // 计算各项得分
  const versionScore = calculateVersionWinRateScore(heroName, processedData);
  const counterScore = calculateCounterScore(heroName, enemyHeroes, processedData);
  
  // 添加调试信息
  console.log(`英雄: ${heroName}, 版本胜率分: ${versionScore.toFixed(2)}, 克制分: ${counterScore.toFixed(2)}`);
  
  if (!hasPlayer) {
    // 无特定玩家时的计算
    const weights = WEIGHTS.WITHOUT_PLAYER;
    const totalScore = weights.versionWinRate * versionScore + 
                      weights.counterRelation * counterScore;
                      
    return {
      heroName,
      totalScore,
      breakdown: {
        versionScore,
        counterScore
      }
    };
  }
  
  // 有特定玩家时的计算
  const normalizedProficiency = normalizeProficiencyScores(playerData);
  const synergyScore = calculateSynergyScore(heroName, allyHeroes, playerData, processedData);
  const proficiencyScore = calculateProficiencyScore(heroName, normalizedProficiency, processedData);
  
  console.log(`  配合分: ${synergyScore.toFixed(2)}, 熟练度分: ${proficiencyScore.toFixed(2)}`);
  
  const weights = WEIGHTS.WITH_PLAYER;
  const totalScore = weights.versionWinRate * versionScore + 
                    weights.counterRelation * counterScore +
                    weights.synergyRelation * synergyScore +
                    weights.playerProficiency * proficiencyScore;
                    
  return {
    heroName,
    totalScore,
    breakdown: {
      versionScore,
      counterScore,
      synergyScore,
      proficiencyScore
    }
  };
};

// 获取英雄推荐列表
export const getHeroRecommendations = (
  availableHeroes,
  allyHeroes,
  enemyHeroes,
  playerData,
  processedData,
  hasPlayer = false
) => {
  // 计算所有可选英雄的分数
  const heroScores = availableHeroes.map(hero => 
    calculateHeroScore(
      hero.name,
      allyHeroes,
      enemyHeroes,
      playerData,
      processedData,
      hasPlayer
    )
  );
  
  // 按分数降序排序
  heroScores.sort((a, b) => b.totalScore - a.totalScore);
  
  // 返回前5个推荐
  return heroScores.slice(0, 5).map(score => ({
    ...availableHeroes.find(h => h.name === score.heroName),
    score: Math.round(score.totalScore),
    breakdown: score.breakdown
  }));
};

// 计算团队胜率
export const calculateTeamWinRate = (
  allyHeroes,
  enemyHeroes,
  playerData,
  processedData,
  hasPlayer = false
) => {
  if (allyHeroes.length !== 5 || enemyHeroes.length !== 5) {
    return null;
  }
  
  let allyScore = 0;
  let enemyScore = 0;
  
  // 计算版本胜率优势
  allyHeroes.forEach(hero => {
    allyScore += getHeroWinRate(hero.name, processedData) * 100;
  });
  
  enemyHeroes.forEach(hero => {
    enemyScore += getHeroWinRate(hero.name, processedData) * 100;
  });
  
  // 计算克制关系优势
  allyHeroes.forEach(ally => {
    enemyHeroes.forEach(enemy => {
      const allyCounterRate = getCounterRate(ally.name, enemy.name, processedData);
      allyScore += allyCounterRate * 20; // 克制关系权重
      
      const enemyCounterRate = getCounterRate(enemy.name, ally.name, processedData);
      enemyScore += enemyCounterRate * 20;
    });
  });
  
  // 如果有玩家数据，加入熟练度因素
  if (hasPlayer && playerData) {
    const normalizedProficiency = normalizeProficiencyScores(playerData);
    allyHeroes.forEach(hero => {
      const profScore = calculateProficiencyScore(hero.name, normalizedProficiency, processedData);
      allyScore += profScore * 0.5; // 熟练度对胜率的影响
    });
  }
  
  // 计算最终胜率
  const totalScore = allyScore + enemyScore;
  const allyWinRate = totalScore > 0 ? (allyScore / totalScore) * 100 : 50;
  
  return {
    ally: Math.max(20, Math.min(80, allyWinRate)), // 限制在20-80%之间
    enemy: Math.max(20, Math.min(80, 100 - allyWinRate))
  };
};