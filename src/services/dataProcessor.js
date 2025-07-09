// 数据处理服务 - 修复克制关系计算
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
  console.log('克制关系矩阵:', counterMatrix);
  
  const processedData = {};
  
  heroStats.forEach(hero => {
    const heroId = hero.id;
    const englishName = reverseHeroMapping[heroId];
    const chineseName = getHeroChineseName(heroId);
    
    // 获取该英雄的克制关系数据
    const counters = counterMatrix[heroId] || {};
    
    console.log(`处理英雄 ${heroId} (${englishName}), 克制数据条目数: ${Object.keys(counters).length}`);
    
    const heroData = {
      id: heroId,
      winRate: hero.winRate,
      counters: counters
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
  
  // 详细检查一个英雄的数据
  const testHero = processedData['Anti-Mage'] || processedData['敌法师'];
  if (testHero) {
    console.log('测试英雄数据:', testHero);
    console.log('测试英雄克制关系样本:', Object.entries(testHero.counters).slice(0, 5));
  }
  
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

// 获取英雄对另一个英雄的克制率 - 关键修复
export const getCounterRate = (hero1Name, hero2Name, processedData) => {
  console.log(`=== 查询克制关系: ${hero1Name} vs ${hero2Name} ===`);
  
  const hero1Data = processedData[hero1Name];
  const hero2Data = processedData[hero2Name];
  
  if (!hero1Data) {
    console.log(`错误: 未找到英雄 ${hero1Name} 的数据`);
    console.log('可用英雄:', Object.keys(processedData).slice(0, 10));
    return 0.5;
  }
  
  if (!hero2Data) {
    console.log(`错误: 未找到英雄 ${hero2Name} 的数据`);
    console.log('可用英雄:', Object.keys(processedData).slice(0, 10));
    return 0.5;
  }
  
  const hero1Id = hero1Data.id;
  const hero2Id = hero2Data.id;
  
  console.log(`英雄ID: ${hero1Name}(${hero1Id}) vs ${hero2Name}(${hero2Id})`);
  console.log(`英雄1的克制数据:`, hero1Data.counters);
  console.log(`英雄1的克制数据keys:`, Object.keys(hero1Data.counters));
  
  // 检查克制关系数据
  if (hero1Data.counters && typeof hero1Data.counters === 'object') {
    const counterValue = hero1Data.counters[hero2Id];
    console.log(`查找 ${hero2Id} 在克制数据中的值:`, counterValue);
    
    if (counterValue !== undefined && counterValue !== null) {
      console.log(`✓ 找到克制数据: ${hero1Name} vs ${hero2Name} = ${counterValue}`);
      return counterValue;
    }
  }
  
  console.log(`✗ 未找到克制数据: ${hero1Name} vs ${hero2Name}，返回默认值 0.5`);
  return 0.5;
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
  console.log(`=== 查询配合关系: ${hero1Name} + ${hero2Name} ===`);
  
  if (!playerData) {
    // 无玩家数据时，基于英雄胜率计算配合关系
    const hero1Data = processedData[hero1Name];
    const hero2Data = processedData[hero2Name];
    
    if (!hero1Data || !hero2Data) {
      console.log(`配合关系计算失败，返回默认值 0.5`);
      return 0.5;
    }
    
    // 基于两个英雄的胜率计算配合关系
    const avgWinRate = (hero1Data.winRate + hero2Data.winRate) / 2;
    
    // 添加基于英雄ID的稳定变化
    const variation = ((hero1Data.id + hero2Data.id) % 20 - 10) * 0.002; // -0.02 到 0.02 的变化
    const synergyRate = Math.max(0.46, Math.min(0.54, avgWinRate + variation));
    
    console.log(`✓ 配合关系: ${hero1Name} + ${hero2Name} = ${synergyRate.toFixed(3)} (基于胜率)`);
    return synergyRate;
  }
  
  // 有玩家数据时，基于熟练度计算配合关系
  const hero1Proficiency = getPlayerProficiency(hero1Name, playerData, processedData);
  const hero2Proficiency = getPlayerProficiency(hero2Name, playerData, processedData);
  
  // 基于熟练度计算配合关系
  const avgProficiency = (hero1Proficiency + hero2Proficiency) / 200; // 标准化到0-1
  const synergyRate = 0.47 + (avgProficiency * 0.06); // 在0.47-0.53之间变化
  
  console.log(`✓ 配合关系: ${hero1Name} + ${hero2Name} = ${synergyRate.toFixed(3)} (基于熟练度)`);
  return synergyRate;
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