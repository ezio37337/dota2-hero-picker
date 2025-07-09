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
  
  // 只保留我们需要的英雄的数据
  const heroIds = getAllHeroIds();
  const filteredData = data.filter(hero => heroIds.includes(hero.id));
  
  console.log(`获取到 ${filteredData.length} 个英雄的统计数据`);
  
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
    
    const winRate = totalPicks > 0 ? totalWins / totalPicks : 0.5;
    
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
  
  try {
    const data = await fetchAPI(`/heroes/${heroId}/matchups`);
    console.log(`英雄 ${heroId} 获取到 ${data.length} 条克制关系数据`);
    
    // 只保留我们需要的英雄数据，并且要求有足够的样本
    const heroIds = getAllHeroIds();
    const filteredData = data.filter(matchup => 
      heroIds.includes(matchup.hero_id) && matchup.games_played >= 50
    );
    
    console.log(`英雄 ${heroId} 有效克制关系数据: ${filteredData.length} 条`);
    
    // 转换为克制率映射
    const matchups = {};
    filteredData.forEach(matchup => {
      const winRate = matchup.wins / matchup.games_played;
      matchups[matchup.hero_id] = winRate;
      console.log(`  vs 英雄 ${matchup.hero_id}: ${winRate.toFixed(3)} (${matchup.wins}/${matchup.games_played})`);
    });
    
    return matchups;
  } catch (error) {
    console.error(`获取英雄 ${heroId} 的克制关系失败:`, error);
    return {};
  }
};

// 获取所有英雄的克制关系矩阵
export const fetchAllHeroMatchups = async () => {
  console.log('开始构建克制关系矩阵...');
  
  const heroIds = getAllHeroIds();
  console.log(`需要获取 ${heroIds.length} 个英雄的克制关系数据`);
  
  const counterMatrix = {};
  
  // 为了避免API限制，添加延迟
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  // 只获取前20个英雄的数据进行测试
  const testHeroIds = heroIds.slice(0, 20);
  console.log('测试英雄IDs:', testHeroIds);
  
  for (let i = 0; i < testHeroIds.length; i++) {
    const heroId = testHeroIds[i];
    
    try {
      console.log(`[${i + 1}/${testHeroIds.length}] 处理英雄 ${heroId}...`);
      
      const matchups = await fetchHeroMatchups(heroId);
      counterMatrix[heroId] = matchups;
      
      console.log(`英雄 ${heroId} 处理完成，获得 ${Object.keys(matchups).length} 条克制关系`);
      
      // 每次请求后延迟300ms，避免触发速率限制
      if (i < testHeroIds.length - 1) {
        await delay(300);
      }
      
    } catch (error) {
      console.error(`获取英雄 ${heroId} 的克制关系失败:`, error);
      counterMatrix[heroId] = {};
    }
  }
  
  // 统计结果
  const totalHeroes = Object.keys(counterMatrix).length;
  const heroesWithData = Object.entries(counterMatrix).filter(([_, data]) => Object.keys(data).length > 0).length;
  
  console.log(`克制关系矩阵构建完成: ${heroesWithData}/${totalHeroes} 个英雄有数据`);
  console.log('最终矩阵数据示例:', Object.entries(counterMatrix).slice(0, 2));
  
  return counterMatrix;
};

// 获取玩家的英雄数据
export const fetchPlayerHeroes = async (accountId) => {
  console.log(`正在获取玩家 ${accountId} 的英雄数据...`);
  const data = await fetchAPI(`/players/${accountId}/heroes`);
  
  // 只保留我们需要的英雄数据
  const heroIds = getAllHeroIds();
  const filteredData = data.filter(hero => heroIds.includes(hero.hero_id));
  
  console.log(`玩家 ${accountId} 的英雄数据条目数: ${filteredData.length}`);
  
  // 处理数据，提取熟练度
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