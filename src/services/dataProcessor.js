// 数据处理服务 - 优化版本
import * as api from './opendotaApi';
import * as storage from '../utils/storage';
import { reverseHeroMapping, getHeroChineseName, heroMapping } from '../data/heroMapping';

// 初始化静态数据
export const initializeStaticData = async () => {
  console.log('开始初始化静态数据...');
  
  // 尝试从缓存加载
  const cachedHeroStats = storage.loadHeroStats();
  const cachedCounterMatrix = storage.loadCounterMatrix();
  
  if (cachedHeroStats && cachedCounterMatrix) {
    console.log('从缓存加载静态数据成功');
    
    // 检查数据完整性
    const heroCount = Object.keys(cachedCounterMatrix).length;
    const matchupCount = Object.values(cachedCounterMatrix).reduce((sum, matchups) => 
      sum + Object.keys(matchups).length, 0);
    
    console.log(`缓存数据统计: ${heroCount}个英雄, ${matchupCount}个克制关系`);
    
    // 如果数据不完整（比如之前只获取了部分英雄），则重新获取
    if (heroCount < 100) {
      console.log('缓存数据不完整，重新获取...');
    } else {
      return {
        heroStats: cachedHeroStats,
        counterMatrix: cachedCounterMatrix
      };
    }
  }
  
  console.log('缓存已过期或不存在，从API获取数据...');
  
  try {
    // 获取英雄统计数据
    const heroStats = await api.fetchHeroStats();
    
    // 获取克制关系矩阵（使用优化后的方法）
    const counterMatrix = await api.fetchAllHeroMatchups();
    
    // 保存到缓存
    storage.saveHeroStats(heroStats);
    storage.saveCounterMatrix(counterMatrix);
    
    console.log('静态数据初始化完成');
    return {
      heroStats: heroStats,
      counterMatrix: counterMatrix
    };
  } catch (error) {
    console.error('初始化静态数据失败:', error);
    
    // 如果完全失败，尝试使用任何可用的缓存数据
    if (cachedHeroStats || cachedCounterMatrix) {
      console.log('使用过期的缓存数据作为备份');
      return {
        heroStats: cachedHeroStats || [],
        counterMatrix: cachedCounterMatrix || {}
      };
    }
    
    throw error;
  }
};

// 获取玩家数据
export const fetchPlayerData = async (playerId, steamId) => {
  if (!steamId) {
    console.log('Steam ID未提供');
    return null;
  }
  
  // 尝试从缓存加载
  const cachedData = storage.loadPlayerCache(playerId);
  if (cachedData) {
    console.log(`从缓存加载玩家 ${playerId} 的数据`);
    return cachedData;
  }
  
  console.log(`从API获取玩家 ${playerId} 的数据...`);
  
  try {
    // 获取玩家英雄数据
    const playerData = await api.fetchPlayerHeroes(steamId);
    
    // 获取玩家信息（可选）
    const playerInfo = await api.fetchPlayerInfo(steamId);
    if (playerInfo) {
      playerData.info = playerInfo;
    }
    
    // 保存到缓存
    storage.savePlayerCache(playerId, playerData);
    
    return playerData;
  } catch (error) {
    console.error(`获取玩家 ${playerId} 数据失败:`, error);
    return null;
  }
};

// 处理英雄数据格式
export const processHeroData = (heroStats, counterMatrix) => {
  console.log('开始处理英雄数据...');
  console.log('英雄统计数据条目数:', heroStats.length);
  console.log('克制关系矩阵英雄数:', Object.keys(counterMatrix).length);
  
  const processedData = {};
  let totalCounterRelations = 0;
  
  heroStats.forEach(hero => {
    const heroId = hero.id;
    const englishName = reverseHeroMapping[heroId];
    const chineseName = getHeroChineseName(heroId);
    
    // 获取该英雄的克制关系数据
    const counters = counterMatrix[heroId] || {};
    totalCounterRelations += Object.keys(counters).length;
    
    const heroData = {
      id: heroId,
      winRate: hero.winRate,
      counters: counters,
      totalPicks: hero.totalPicks,
      totalWins: hero.totalWins
    };
    
    // 为英文名和中文名都创建映射
    if (englishName) {
      processedData[englishName] = heroData;
    }
    
    if (chineseName && chineseName !== englishName) {
      processedData[chineseName] = heroData;
    }
  });
  
  console.log('处理完成，总条目数:', Object.keys(processedData).length);
  console.log('总克制关系数:', totalCounterRelations);
  console.log('平均每英雄克制关系:', (totalCounterRelations / heroStats.length).toFixed(1));
  
  return processedData;
};

// 获取英雄的版本胜率
export const getHeroWinRate = (heroName, processedData) => {
  const heroData = processedData[heroName];
  if (!heroData) {
    console.log(`未找到英雄 ${heroName} 的数据`);
    return 0.5;
  }
  
  return heroData.winRate;
};

// 获取英雄对另一个英雄的克制率 - 增强版
export const getCounterRate = (hero1Name, hero2Name, processedData) => {
  const hero1Data = processedData[hero1Name];
  const hero2Data = processedData[hero2Name];
  
  if (!hero1Data || !hero2Data) {
    return 0.5;
  }
  
  const hero1Id = hero1Data.id;
  const hero2Id = hero2Data.id;
  
  // 检查克制关系数据
  if (hero1Data.counters && typeof hero1Data.counters === 'object') {
    const counterValue = hero1Data.counters[hero2Id];
    
    if (counterValue !== undefined && counterValue !== null) {
      return counterValue;
    }
  }
  
  // 如果没有直接的克制数据，使用基于胜率的估算
  const winRateDiff = hero1Data.winRate - hero2Data.winRate;
  const estimatedCounter = 0.5 + (winRateDiff * 0.3); // 胜率差异影响30%
  
  return Math.max(0.3, Math.min(0.7, estimatedCounter));
};

// 获取玩家对英雄的熟练度得分
export const getPlayerProficiency = (heroName, playerData, processedData) => {
  if (!playerData || !processedData[heroName]) {
    return 0;
  }
  
  const heroId = processedData[heroName].id;
  const proficiencyData = playerData.proficiency[heroId];
  
  if (!proficiencyData) {
    return 0;
  }
  
  return proficiencyData.score;
};

// 获取英雄间的配合胜率 - 增强版
export const getSynergyRate = (hero1Name, hero2Name, playerData, processedData) => {
  if (!playerData) {
    // 无玩家数据时，基于英雄胜率计算配合关系
    const hero1Data = processedData[hero1Name];
    const hero2Data = processedData[hero2Name];
    
    if (!hero1Data || !hero2Data) {
      return 0.5;
    }
    
    // 基于两个英雄的胜率计算配合关系
    const avgWinRate = (hero1Data.winRate + hero2Data.winRate) / 2;
    
    // 添加基于英雄ID的稳定变化
    const variation = ((hero1Data.id + hero2Data.id) % 20 - 10) * 0.002;
    const synergyRate = Math.max(0.46, Math.min(0.54, avgWinRate + variation));
    
    return synergyRate;
  }
  
  // 有玩家数据时，基于熟练度计算配合关系
  const hero1Proficiency = getPlayerProficiency(hero1Name, playerData, processedData);
  const hero2Proficiency = getPlayerProficiency(hero2Name, playerData, processedData);
  
  // 如果玩家对两个英雄都有经验，给予额外加成
  const hero1Id = processedData[hero1Name].id;
  const hero2Id = processedData[hero2Name].id;
  
  const hero1Games = playerData.proficiency[hero1Id]?.games || 0;
  const hero2Games = playerData.proficiency[hero2Id]?.games || 0;
  
  // 基于熟练度计算配合关系
  const avgProficiency = (hero1Proficiency + hero2Proficiency) / 200; // 标准化到0-1
  let synergyRate = 0.47 + (avgProficiency * 0.06); // 在0.47-0.53之间变化
  
  // 如果玩家对两个英雄都有一定经验，给予额外加成
  if (hero1Games >= 10 && hero2Games >= 10) {
    synergyRate += 0.02; // 额外2%加成
  }
  
  return Math.min(0.6, synergyRate);
};

// 归一化熟练度得分（0-100）- 优化版
export const normalizeProficiencyScores = (playerData) => {
  if (!playerData || !playerData.proficiency) {
    return {};
  }
  
  const normalized = {};
  const proficiencyEntries = Object.entries(playerData.proficiency);
  
  // 找出最高分数用于归一化
  const scores = proficiencyEntries.map(([_, data]) => data.score);
  const maxScore = Math.max(...scores, 1);
  
  proficiencyEntries.forEach(([heroId, data]) => {
    // 归一化到0-100分
    const normalizedScore = Math.min(100, (data.score / maxScore) * 100);
    
    normalized[heroId] = {
      ...data,
      normalizedScore: normalizedScore,
      optimizedScore: normalizedScore
    };
  });
  
  return normalized;
};

// 获取数据质量报告
export const getDataQualityReport = (processedData) => {
  const report = {
    totalHeroes: 0,
    heroesWithCounterData: 0,
    totalCounterRelations: 0,
    highQualityRelations: 0,
    mediumQualityRelations: 0,
    lowQualityRelations: 0,
    averageCountersPerHero: 0
  };
  
  const uniqueHeroIds = new Set();
  
  Object.values(processedData).forEach(heroData => {
    if (!uniqueHeroIds.has(heroData.id)) {
      uniqueHeroIds.add(heroData.id);
      report.totalHeroes++;
      
      const counterCount = Object.keys(heroData.counters).length;
      if (counterCount > 0) {
        report.heroesWithCounterData++;
        report.totalCounterRelations += counterCount;
      }
    }
  });
  
  report.averageCountersPerHero = report.heroesWithCounterData > 0 ? 
    (report.totalCounterRelations / report.heroesWithCounterData).toFixed(1) : 0;
  
  console.log('数据质量报告:', report);
  
  return report;
};