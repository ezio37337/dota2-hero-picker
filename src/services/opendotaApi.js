// OpenDota API 服务
import { getAllHeroIds } from '../data/heroMapping';

const BASE_URL = 'https://api.opendota.com/api';

// API请求的基础函数
const fetchAPI = async (endpoint) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API请求错误:', error);
    throw error;
  }
};

// 获取所有英雄的统计数据
export const fetchHeroStats = async () => {
  console.log('正在获取英雄统计数据...');
  const data = await fetchAPI('/heroStats');
  
  // 只保留我们需要的20个英雄的数据
  const heroIds = getAllHeroIds();
  const filteredData = data.filter(hero => heroIds.includes(hero.id));
  
  // 计算全段位胜率
  return filteredData.map(hero => {
    let totalPicks = 0;
    let totalWins = 0;
    
    // 累加所有段位的数据（1-8代表从Herald到Immortal）
    for (let i = 1; i <= 8; i++) {
      const picks = hero[`${i}_pick`] || 0;
      const wins = hero[`${i}_win`] || 0;
      totalPicks += picks;
      totalWins += wins;
    }
    
    const winRate = totalPicks > 0 ? totalWins / totalPicks : 0;
    
    return {
      id: hero.id,
      name: hero.localized_name,
      winRate: winRate,
      totalPicks: totalPicks,
      totalWins: totalWins
    };
  });
};

// 获取单个英雄的克制关系数据
export const fetchHeroMatchups = async (heroId) => {
  console.log(`正在获取英雄 ${heroId} 的克制关系...`);
  const data = await fetchAPI(`/heroes/${heroId}/matchups`);
  
  // 只保留我们需要的英雄数据
  const heroIds = getAllHeroIds();
  const filteredData = data.filter(matchup => heroIds.includes(matchup.hero_id));
  
  // 转换为克制率映射
  const matchups = {};
  filteredData.forEach(matchup => {
    const winRate = matchup.games_played > 0 
      ? matchup.wins / matchup.games_played 
      : 0.5; // 如果没有数据，默认50%胜率
    matchups[matchup.hero_id] = winRate;
  });
  
  return matchups;
};

// 获取所有英雄的克制关系矩阵
export const fetchAllHeroMatchups = async () => {
  console.log('正在构建克制关系矩阵...');
  const heroIds = getAllHeroIds();
  const counterMatrix = {};
  
  // 为了避免API限制，添加延迟
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  for (const heroId of heroIds) {
    try {
      const matchups = await fetchHeroMatchups(heroId);
      counterMatrix[heroId] = matchups;
      
      // 每次请求后延迟100ms，避免触发速率限制
      await delay(100);
    } catch (error) {
      console.error(`获取英雄 ${heroId} 的克制关系失败:`, error);
      counterMatrix[heroId] = {};
    }
  }
  
  return counterMatrix;
};

// 获取玩家的英雄数据
export const fetchPlayerHeroes = async (accountId) => {
  console.log(`正在获取玩家 ${accountId} 的英雄数据...`);
  const data = await fetchAPI(`/players/${accountId}/heroes`);
  
  // 只保留我们需要的英雄数据
  const heroIds = getAllHeroIds();
  const filteredData = data.filter(hero => heroIds.includes(hero.hero_id));
  
  // 处理数据，提取熟练度和配合关系
  const playerData = {
    proficiency: {},
    synergies: {}
  };
  
  filteredData.forEach(hero => {
    // 计算熟练度
    const winRate = hero.games > 0 ? hero.win / hero.games : 0;
    const proficiency = (hero.win * 2 + hero.games) * (winRate * 100) / 100;
    playerData.proficiency[hero.hero_id] = {
      games: hero.games,
      wins: hero.win,
      winRate: winRate,
      score: proficiency,
      lastPlayed: hero.last_played
    };
    
    // 初始化该英雄的配合关系
    playerData.synergies[hero.hero_id] = {};
  });
  
  // 由于API的限制，配合关系需要从详细数据中提取
  // 这里我们先返回基础数据，配合关系可以后续通过其他方式获取
  console.log('注意：配合关系数据需要额外的API调用，暂时使用默认值');
  
  return playerData;
};

// 获取玩家基本信息
export const fetchPlayerInfo = async (accountId) => {
  console.log(`正在获取玩家 ${accountId} 的基本信息...`);
  try {
    const data = await fetchAPI(`/players/${accountId}`);
    return {
      accountId: data.profile.account_id,
      personaname: data.profile.personaname,
      avatar: data.profile.avatar,
      avatarfull: data.profile.avatarfull
    };
  } catch (error) {
    console.error('获取玩家信息失败:', error);
    return null;
  }
};