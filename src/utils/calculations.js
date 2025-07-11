// 推荐算法计算工具 - 修复版本
import { 
  getHeroWinRate, 
  getCounterRate, 
  getSynergyRate,
  normalizeProficiencyScores 
} from '../services/dataProcessor';

// 权重配置
const WEIGHTS = {
  WITH_PLAYER: {
    versionWinRate: 0.20,
    counterRelation: 0.50,
    synergyRelation: 0.20,
    playerProficiency: 0.10
  },
  WITHOUT_PLAYER: {
    versionWinRate: 0.25,
    counterRelation: 0.75
  }
};

// 计算版本胜率得分（0-100）- 保持原有逻辑
const calculateVersionWinRateScore = (heroName, processedData) => {
  const winRate = getHeroWinRate(heroName, processedData);
  // 将胜率归一化到更小的范围，减少极端值的影响
  const normalizedScore = Math.max(30, Math.min(70, winRate * 100));
  return normalizedScore;
};

// 优化的克制关系计算 - 使用附件中的推荐方式
const calculateCounterScore = (heroName, enemyHeroes, processedData) => {
  console.log(`\n=== 计算 ${heroName} 的克制关系 ===`);
  
  // 如果没有敌方英雄，返回中性分数
  if (enemyHeroes.length === 0) {
    console.log(`没有敌方英雄，返回中性分数 50`);
    return 50;
  }
  
  let totalCounterScore = 0;
  let totalWeight = 0;
  
  // 对每个敌方英雄分别计算克制关系
  enemyHeroes.forEach(enemy => {
    const counterRate = getCounterRate(heroName, enemy.name, processedData);
    
    // 根据克制率的极端程度给予不同权重
    // 极端克制关系（<0.4或>0.6）更可靠
    const extremity = Math.abs(counterRate - 0.5);
    const weight = 1 + extremity * 2; // 权重1-2
    
    // 将克制胜率转换为分数
    // 0.3 -> 0分, 0.5 -> 50分, 0.7 -> 100分
    const counterScore = Math.max(0, Math.min(100, (counterRate - 0.3) * 250));
    
    totalCounterScore += counterScore * weight;
    totalWeight += weight;
    
    console.log(`  vs ${enemy.name}: 胜率${(counterRate * 100).toFixed(1)}% -> 得分${counterScore.toFixed(1)} (权重${weight.toFixed(2)})`);
  });
  
  // 计算加权平均克制得分
  const avgCounterScore = totalWeight > 0 ? totalCounterScore / totalWeight : 50;
  
  console.log(`  加权平均克制得分: ${avgCounterScore.toFixed(1)}`);
  
  return avgCounterScore;
};

// 优化的配合关系计算
const calculateSynergyScore = (heroName, allyHeroes, playerData, processedData) => {
  console.log(`\n=== 计算 ${heroName} 的配合关系 ===`);
  
  // 如果没有友方英雄，返回中性分数
  if (allyHeroes.length === 0) {
    console.log(`没有友方英雄，返回中性分数 50`);
    return 50;
  }
  
  let totalSynergyScore = 0;
  
  // 对每个友方英雄分别计算配合关系
  allyHeroes.forEach(ally => {
    const synergyRate = getSynergyRate(heroName, ally.name, playerData, processedData);
    
    // 将配合胜率转换为分数
    // 0.4 -> 0分, 0.5 -> 50分, 0.6 -> 100分
    const synergyScore = Math.max(0, Math.min(100, (synergyRate - 0.4) * 500));
    
    totalSynergyScore += synergyScore;
    
    console.log(`  + ${ally.name}: 配合率${(synergyRate * 100).toFixed(1)}% -> 得分${synergyScore.toFixed(1)}`);
  });
  
  // 计算平均配合得分
  const avgSynergyScore = totalSynergyScore / allyHeroes.length;
  
  console.log(`  平均配合得分: ${avgSynergyScore.toFixed(1)}`);
  
  return avgSynergyScore;
};

// 熟练度计算 - 回退到上个版本
const calculateProficiencyScore = (heroName, normalizedProficiency, processedData) => {
  if (!normalizedProficiency || !processedData[heroName]) {
    return 0;
  }
  
  const heroId = processedData[heroName].id;
  const profData = normalizedProficiency[heroId];
  
  if (!profData) {
    return 0;
  }
  
  // 使用归一化后的熟练度分数
  return profData.normalizedScore || 0;
};

// 归一化熟练度分数 - 回退到上个版本
export const normalizeProficiencyScores = (playerData) => {
  if (!playerData || !playerData.proficiency) {
    return {};
  }
  
  const normalized = {};
  const proficiencyEntries = Object.entries(playerData.proficiency);
  
  // 计算所有英雄的熟练度分数
  const scores = proficiencyEntries.map(([heroId, data]) => {
    const { games, wins, winRate } = data;
    
    // 原版熟练度计算公式
    const proficiency = (wins * 2 + games) * (winRate * 100) / 100;
    
    return { heroId, score: proficiency };
  });
  
  // 找出最高分数用于归一化
  const maxScore = Math.max(...scores.map(s => s.score), 1);
  
  // 归一化到0-100分
  proficiencyEntries.forEach(([heroId, data]) => {
    const scoreEntry = scores.find(s => s.heroId === heroId);
    const normalizedScore = Math.min(100, (scoreEntry.score / maxScore) * 100);
    
    normalized[heroId] = {
      ...data,
      normalizedScore: normalizedScore
    };
  });
  
  console.log('熟练度归一化完成，最高分:', maxScore.toFixed(1));
  
  return normalized;
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
  console.log(`\n=================== 计算 ${heroName} 的推荐分数 ===================`);
  
  // 计算各项得分
  const versionScore = calculateVersionWinRateScore(heroName, processedData);
  const counterScore = calculateCounterScore(heroName, enemyHeroes, processedData);
  
  console.log(`版本胜率分: ${versionScore.toFixed(1)}`);
  console.log(`克制关系分: ${counterScore.toFixed(1)}`);
  
  if (!hasPlayer) {
    // 无特定玩家时的计算
    const weights = WEIGHTS.WITHOUT_PLAYER;
    const totalScore = weights.versionWinRate * versionScore + 
                      weights.counterRelation * counterScore;
    
    console.log(`权重分配: 版本胜率(${weights.versionWinRate}) + 克制关系(${weights.counterRelation})`);
    console.log(`计算过程: ${weights.versionWinRate} × ${versionScore.toFixed(1)} + ${weights.counterRelation} × ${counterScore.toFixed(1)} = ${totalScore.toFixed(1)}`);
                      
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
  
  console.log(`配合关系分: ${synergyScore.toFixed(1)}`);
  console.log(`熟练度分: ${proficiencyScore.toFixed(1)}`);
  
  const weights = WEIGHTS.WITH_PLAYER;
  const totalScore = weights.versionWinRate * versionScore + 
                    weights.counterRelation * counterScore +
                    weights.synergyRelation * synergyScore +
                    weights.playerProficiency * proficiencyScore;
  
  console.log(`权重分配: 版本胜率(${weights.versionWinRate}) + 克制关系(${weights.counterRelation}) + 配合关系(${weights.synergyRelation}) + 熟练度(${weights.playerProficiency})`);
  console.log(`计算过程: ${weights.versionWinRate} × ${versionScore.toFixed(1)} + ${weights.counterRelation} × ${counterScore.toFixed(1)} + ${weights.synergyRelation} × ${synergyScore.toFixed(1)} + ${weights.playerProficiency} × ${proficiencyScore.toFixed(1)} = ${totalScore.toFixed(1)}`);
                    
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
  console.log('\n================= 开始计算英雄推荐 =================');
  console.log(`可选英雄数: ${availableHeroes.length}`);
  console.log(`当前友方英雄: ${allyHeroes.map(h => h.name).join(', ') || '无'}`);
  console.log(`当前敌方英雄: ${enemyHeroes.map(h => h.name).join(', ') || '无'}`);
  console.log(`有玩家数据: ${hasPlayer}`);
  
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
  
  console.log('\n================= 推荐结果排序 =================');
  heroScores.slice(0, 10).forEach((score, index) => {
    const breakdown = score.breakdown;
    if (hasPlayer) {
      console.log(`${index + 1}. ${score.heroName}: ${score.totalScore.toFixed(1)}分 (版本:${breakdown.versionScore.toFixed(1)}, 克制:${breakdown.counterScore.toFixed(1)}, 配合:${breakdown.synergyScore.toFixed(1)}, 熟练:${breakdown.proficiencyScore.toFixed(1)})`);
    } else {
      console.log(`${index + 1}. ${score.heroName}: ${score.totalScore.toFixed(1)}分 (版本:${breakdown.versionScore.toFixed(1)}, 克制:${breakdown.counterScore.toFixed(1)})`);
    }
  });
  
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
  
  console.log('\n================= 计算团队胜率 =================');
  
  let allyScore = 0;
  let enemyScore = 0;
  
  // 版本胜率影响
  const versionWinRateWeight = 0.3;
  console.log('计算版本胜率优势...');
  
  allyHeroes.forEach(hero => {
    const winRate = getHeroWinRate(hero.name, processedData);
    const advantage = (winRate - 0.5) * 100;
    allyScore += advantage * versionWinRateWeight;
    console.log(`  我方 ${hero.name}: 胜率${(winRate * 100).toFixed(1)}%, 优势${advantage.toFixed(1)}`);
  });
  
  enemyHeroes.forEach(hero => {
    const winRate = getHeroWinRate(hero.name, processedData);
    const advantage = (winRate - 0.5) * 100;
    enemyScore += advantage * versionWinRateWeight;
    console.log(`  敌方 ${hero.name}: 胜率${(winRate * 100).toFixed(1)}%, 优势${advantage.toFixed(1)}`);
  });
  
  // 克制关系影响
  const counterWeight = 0.6;
  console.log('计算克制关系优势...');
  
  allyHeroes.forEach(ally => {
    enemyHeroes.forEach(enemy => {
      const allyCounterRate = getCounterRate(ally.name, enemy.name, processedData);
      const enemyCounterRate = getCounterRate(enemy.name, ally.name, processedData);
      
      const allyAdvantage = (allyCounterRate - 0.5) * 100;
      const enemyAdvantage = (enemyCounterRate - 0.5) * 100;
      
      allyScore += allyAdvantage * counterWeight;
      enemyScore += enemyAdvantage * counterWeight;
      
      console.log(`  ${ally.name} vs ${enemy.name}: ${(allyCounterRate * 100).toFixed(1)}% (优势${allyAdvantage.toFixed(1)})`);
    });
  });
  
  // 熟练度影响
  if (hasPlayer && playerData) {
    const proficiencyWeight = 0.1;
    console.log('计算熟练度优势...');
    
    const normalizedProficiency = normalizeProficiencyScores(playerData);
    
    allyHeroes.forEach(hero => {
      const profScore = calculateProficiencyScore(hero.name, normalizedProficiency, processedData);
      const advantage = profScore - 50;
      allyScore += advantage * proficiencyWeight;
      console.log(`  我方 ${hero.name}: 熟练度${profScore.toFixed(1)}, 优势${advantage.toFixed(1)}`);
    });
  }
  
  // 计算最终胜率
  const scoreDiff = allyScore - enemyScore;
  const baseWinRate = 50;
  const allyWinRate = baseWinRate + scoreDiff;
  
  // 限制在合理范围内
  const finalAllyWinRate = Math.max(25, Math.min(75, allyWinRate));
  const finalEnemyWinRate = 100 - finalAllyWinRate;
  
  console.log(`我方总得分: ${allyScore.toFixed(1)}`);
  console.log(`敌方总得分: ${enemyScore.toFixed(1)}`);
  console.log(`得分差: ${scoreDiff.toFixed(1)}`);
  console.log(`最终胜率: 我方${finalAllyWinRate.toFixed(1)}% vs 敌方${finalEnemyWinRate.toFixed(1)}%`);
  
  return {
    ally: finalAllyWinRate,
    enemy: finalEnemyWinRate
  };
};