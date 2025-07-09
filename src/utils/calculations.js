// 推荐算法计算工具
import { 
  getHeroWinRate, 
  getCounterRate, 
  getPlayerProficiency, 
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
  enemyHeroes.forEach(enemy => {
    const counterRate = getCounterRate(heroName, enemy.name, processedData);
    totalCounterRate += counterRate;
  });
  
  return (totalCounterRate / enemyHeroes.length) * 100;
};

// 计算配合关系得分（0-100）
const calculateSynergyScore = (heroName, allyHeroes, playerData, processedData) => {
  if (allyHeroes.length === 0) return 50;
  
  let totalSynergyRate = 0;
  allyHeroes.forEach(ally => {
    const synergyRate = getSynergyRate(heroName, ally.name, playerData, processedData);
    totalSynergyRate += synergyRate;
  });
  
  return (totalSynergyRate / allyHeroes.length) * 100;
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
  
  if (!hasPlayer) {
    // 无特定玩家时的计算
    const weights = WEIGHTS.WITHOUT_PLAYER;
    return {
      heroName,
      totalScore: weights.versionWinRate * versionScore + 
                  weights.counterRelation * counterScore,
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
  
  const weights = WEIGHTS.WITH_PLAYER;
  return {
    heroName,
    totalScore: weights.versionWinRate * versionScore + 
                weights.counterRelation * counterScore +
                weights.synergyRelation * synergyScore +
                weights.playerProficiency * proficiencyScore,
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
  
  // 返回前3个推荐
  return heroScores.slice(0, 3).map(score => ({
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