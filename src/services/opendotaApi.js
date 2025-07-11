// OpenDota API 服务 - 优化版本
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

// 统计学增强函数：使用贝叶斯调整
const enhanceMatchupData = (matchup) => {
  const { games_played, wins } = matchup;
  const rawWinRate = games_played > 0 ? wins / games_played : 0.5;
  
  // 使用贝叶斯调整，向整体平均值回归
  const globalPrior = 0.5; // 先验胜率50%
  const priorWeight = 20; // 先验权重，相当于20场比赛
  
  const adjustedWinRate = (wins + priorWeight * globalPrior) / (games_played + priorWeight);
  
  // 计算置信度（基于样本量）
  const confidence = Math.min(1, games_played / 100);
  
  return {
    ...matchup,
    raw_winrate: rawWinRate,
    adjusted_winrate: adjustedWinRate,
    confidence: confidence,
    data_quality: games_played >= 50 ? 'high' : 
                 games_played >= 25 ? 'medium' : 'low'
  };
};

// 获取单个英雄的克制关系数据 - 优化版
export const fetchHeroMatchups = async (heroId) => {
  console.log(`正在获取英雄 ${heroId} 的克制关系...`);
  
  try {
    const data = await fetchAPI(`/heroes/${heroId}/matchups`);
    console.log(`英雄 ${heroId} 获取到 ${data.length} 条克制关系数据`);
    
    // 降低阈值到25场，并进行统计学增强
    const heroIds = getAllHeroIds();
    const enhancedData = data
      .filter(matchup => heroIds.includes(matchup.hero_id) && matchup.games_played >= 25)
      .map(enhanceMatchupData);
    
    console.log(`英雄 ${heroId} 有效克制关系数据: ${enhancedData.length} 条`);
    
    // 转换为克制率映射，使用调整后的胜率
    const matchups = {};
    enhancedData.forEach(matchup => {
      matchups[matchup.hero_id] = matchup.adjusted_winrate;
      
      if (matchup.games_played >= 100) {
        console.log(`  vs 英雄 ${matchup.hero_id}: ${matchup.adjusted_winrate.toFixed(3)} ` +
                    `(${matchup.wins}/${matchup.games_played}, 置信度${(matchup.confidence * 100).toFixed(0)}%)`);
      }
    });
    
    return matchups;
  } catch (error) {
    console.error(`获取英雄 ${heroId} 的克制关系失败:`, error);
    return {};
  }
};

// 批量获取多个英雄的克制关系（提高效率）
const fetchHeroMatchupsBatch = async (heroIds, batchSize = 5) => {
  const results = {};
  
  for (let i = 0; i < heroIds.length; i += batchSize) {
    const batch = heroIds.slice(i, i + batchSize);
    const batchPromises = batch.map(heroId => 
      fetchHeroMatchups(heroId)
        .then(matchups => ({ heroId, matchups }))
        .catch(error => {
          console.error(`获取英雄 ${heroId} 失败:`, error);
          return { heroId, matchups: {} };
        })
    );
    
    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(({ heroId, matchups }) => {
      results[heroId] = matchups;
    });
    
    // 批次间延迟，避免触发速率限制
    if (i + batchSize < heroIds.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
};

// 获取所有英雄的克制关系矩阵 - 优化版
export const fetchAllHeroMatchups = async () => {
  console.log('开始构建克制关系矩阵（优化版）...');
  
  const heroIds = getAllHeroIds();
  console.log(`需要获取 ${heroIds.length} 个英雄的克制关系数据`);
  
  // 分批处理，避免一次性请求过多
  const batchSize = 10;
  const counterMatrix = {};
  
  for (let i = 0; i < heroIds.length; i += batchSize) {
    const batch = heroIds.slice(i, i + batchSize);
    console.log(`处理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(heroIds.length/batchSize)}`);
    
    const batchResults = await fetchHeroMatchupsBatch(batch, 5);
    Object.assign(counterMatrix, batchResults);
    
    // 显示进度
    const progress = Math.min(100, ((i + batch.length) / heroIds.length * 100)).toFixed(1);
    console.log(`进度: ${progress}%`);
  }
  
  // 统计结果
  const totalHeroes = Object.keys(counterMatrix).length;
  const heroesWithData = Object.entries(counterMatrix).filter(([_, data]) => Object.keys(data).length > 0).length;
  const totalMatchups = Object.values(counterMatrix).reduce((sum, matchups) => sum + Object.keys(matchups).length, 0);
  
  console.log(`\n克制关系矩阵构建完成:`);
  console.log(`- 处理英雄数: ${totalHeroes}`);
  console.log(`- 有数据的英雄: ${heroesWithData}`);
  console.log(`- 总克制关系数: ${totalMatchups}`);
  console.log(`- 平均每英雄克制关系: ${(totalMatchups / heroesWithData).toFixed(1)}`);
  
  // 数据质量分析
  let highQuality = 0, mediumQuality = 0, lowQuality = 0;
  Object.values(counterMatrix).forEach(matchups => {
    Object.values(matchups).forEach(winRate => {
      if (winRate >= 0.45 && winRate <= 0.55) mediumQuality++;
      else if (winRate < 0.35 || winRate > 0.65) highQuality++;
      else lowQuality++;
    });
  });
  
  console.log(`\n数据质量分布:`);
  console.log(`- 高对比度（<35%或>65%）: ${highQuality}`);
  console.log(`- 中等对比度（45%-55%）: ${mediumQuality}`);
  console.log(`- 低对比度: ${lowQuality}`);
  
  return counterMatrix;
};

// 获取玩家的英雄数据 - 增强版
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
    synergies: {},
    totalGames: 0,
    totalWins: 0
  };
  
  filteredData.forEach(hero => {
    // 计算熟练度 - 使用优化后的公式
    const winRate = hero.games > 0 ? hero.win / hero.games : 0;
    
    // 新的熟练度计算公式
    const baseScore = winRate * 60; // 基础分（最高60分）
    const experienceBonus = Math.log(hero.games + 1) * 8; // 经验加成（最高约40分）
    const winsBonus = Math.sqrt(hero.win) * 2; // 胜场加成
    const proficiencyScore = baseScore + experienceBonus + winsBonus;
    
    playerData.proficiency[hero.hero_id] = {
      games: hero.games,
      wins: hero.win,
      winRate: winRate,
      score: proficiencyScore,
      lastPlayed: hero.last_played
    };
    
    // 统计总数据
    playerData.totalGames += hero.games;
    playerData.totalWins += hero.win;
    
    // 初始化该英雄的配合关系
    playerData.synergies[hero.hero_id] = {};
  });
  
  // 计算玩家整体胜率
  playerData.overallWinRate = playerData.totalGames > 0 ? 
    playerData.totalWins / playerData.totalGames : 0.5;
  
  console.log(`玩家整体数据: ${playerData.totalGames}场, 胜率${(playerData.overallWinRate * 100).toFixed(1)}%`);
  
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
      avatarfull: data.profile.avatarfull,
      rank_tier: data.rank_tier,
      leaderboard_rank: data.leaderboard_rank
    };
  } catch (error) {
    console.error('获取玩家信息失败:', error);
    return null;
  }
};