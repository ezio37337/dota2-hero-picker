// 数据处理服务 - 整合API数据和缓存管理
import * as api from './opendotaApi';
import * as storage from '../utils/storage';
import { reverseHeroMapping, getHeroChineseName } from '../data/heroMapping';

// 初始化静态数据（英雄胜率和克制关系）
export const initializeStaticData = async () => {
  console.log('开始初始化静态数据...');
  
  // 尝试从缓存加载
  const cachedHeroStats = storage.loadHeroStats();
  const cachedCounterMatrix = storage.loadCounterMatrix();
  
  if (cachedHeroStats && cachedCounterMatrix) {
    console.log('从缓存加载静态数据成功');
    return {
      heroStats: cachedHeroStats,
      counterMatrix: cachedCounterMatrix
    };
  }
  
  console.log('缓存已过期或不存在，从API获取数据...');
  
  try {
    // 获取英雄统计数据
    const heroStats = await api.fetchHeroStats();
    
    // 获取克制关系矩阵
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
    
    // 如果API失败，尝试使用过期的缓存数据
    const expiredStats = storage.loadFromStorage('dota2_hero_stats');
    const expiredMatrix = storage.loadFromStorage('dota2_counter_matrix');
    
    if (expiredStats && expiredMatrix) {
      console.log('使用过期的缓存数据');
      return {
        heroStats: expiredStats,
        counterMatrix: expiredMatrix
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

// 处理英雄数据格式，使其与现有组件兼容
export const processHeroData = (heroStats, counterMatrix) => {
  const processedData = {};
  
  heroStats.forEach(hero => {
    // 获取英雄的中文名（如果有的话）
    const chineseName = getHeroChineseName(hero.id);
    const englishName = reverseHeroMapping[hero.id];
    
    // 同时为英文名和中文名创建映射
    const heroData = {
      id: hero.id,
      winRate: hero.winRate,
      counters: counterMatrix[hero.id] || {}
    };
    
    // 英文名映射
    if (englishName) {
      processedData[englishName] = heroData;
    }
    
    // 中文名映射
    if (chineseName && chineseName !== englishName) {
      processedData[chineseName] = heroData;
    }
  });
  
  console.log('处理后的英雄数据样本:', Object.keys(processedData).slice(0, 5));
  console.log('示例克制数据:', processedData['Anti-Mage'] || processedData['敌法师']);
  
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

// 获取英雄对另一个英雄的克制率
export const getCounterRate = (hero1Name, hero2Name, processedData) => {
  const hero1Data = processedData[hero1Name];
  const hero2Data = processedData[hero2Name];
  
  if (!hero1Data || !hero2Data) {
    console.log(`未找到英雄数据: ${hero1Name} 或 ${hero2Name}`);
    return 0.5;
  }
  
  const hero2Id = hero2Data.id;
  
  if (hero1Data.counters && hero1Data.counters[hero2Id] !== undefined) {
    const counterRate = hero1Data.counters[hero2Id];
    console.log(`${hero1Name} vs ${hero2Name}: ${counterRate}`);
    return counterRate;
  }
  
  console.log(`未找到克制数据: ${hero1Name} vs ${hero2Name}`);
  return 0.5; // 默认50%
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

// 获取英雄间的配合胜率
export const getSynergyRate = (hero1Name, hero2Name, playerData, processedData) => {
  if (!playerData) {
    // 无玩家数据时，基于英雄类型计算简单的配合关系
    const hero1Data = processedData[hero1Name];
    const hero2Data = processedData[hero2Name];
    
    if (!hero1Data || !hero2Data) {
      return 0.5;
    }
    
    // 简单的配合关系：基于英雄胜率的平均值
    const avgWinRate = (hero1Data.winRate + hero2Data.winRate) / 2;
    
    // 如果两个英雄的胜率都比较高，配合关系稍好
    if (avgWinRate > 0.52) {
      return 0.52;
    } else if (avgWinRate < 0.48) {
      return 0.48;
    }
    
    return 0.5;
  }
  
  // 有玩家数据时，可以基于玩家的历史比赛数据计算
  // 由于当前API限制，暂时返回基于熟练度的配合关系
  const hero1Proficiency = getPlayerProficiency(hero1Name, playerData, processedData);
  const hero2Proficiency = getPlayerProficiency(hero2Name, playerData, processedData);
  
  // 基于熟练度计算配合关系
  const avgProficiency = (hero1Proficiency + hero2Proficiency) / 200; // 标准化到0-1
  return 0.45 + (avgProficiency * 0.1); // 在0.45-0.55之间变化
};

// 归一化熟练度得分（0-100）
export const normalizeProficiencyScores = (playerData) => {
  if (!playerData || !playerData.proficiency) {
    return {};
  }
  
  const scores = Object.values(playerData.proficiency).map(p => p.score);
  const maxScore = Math.max(...scores, 1); // 避免除以0
  
  const normalized = {};
  Object.entries(playerData.proficiency).forEach(([heroId, data]) => {
    normalized[heroId] = {
      ...data,
      normalizedScore: Math.min(100, (data.score / maxScore) * 100)
    };
  });
  
  return normalized;
};