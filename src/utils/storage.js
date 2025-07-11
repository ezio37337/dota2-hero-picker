// 本地存储工具函数
const STORAGE_KEYS = {
  HERO_STATS: 'dota2_hero_stats',
  COUNTER_MATRIX: 'dota2_counter_matrix',
  PLAYER_CACHE: 'dota2_player_cache',
  LAST_UPDATE: 'dota2_last_update',
  PLAYER_PROFILES: 'dota2_player_profiles'
};

// 保存数据到localStorage
export const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('保存数据失败:', error);
    return false;
  }
};

// 从localStorage读取数据
export const loadFromStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('读取数据失败:', error);
    return null;
  }
};

// 检查数据是否需要更新（24小时过期）
export const isDataExpired = (timestamp) => {
  if (!timestamp) return true;
  const ONE_DAY = 24 * 60 * 60 * 1000; // 24小时的毫秒数
  return Date.now() - timestamp > ONE_DAY;
};

// 保存英雄统计数据
export const saveHeroStats = (data) => {
  saveToStorage(STORAGE_KEYS.HERO_STATS, data);
  saveToStorage(STORAGE_KEYS.LAST_UPDATE, Date.now());
};

// 读取英雄统计数据
export const loadHeroStats = () => {
  const lastUpdate = loadFromStorage(STORAGE_KEYS.LAST_UPDATE);
  if (isDataExpired(lastUpdate)) {
    return null;
  }
  return loadFromStorage(STORAGE_KEYS.HERO_STATS);
};

// 保存克制关系矩阵
export const saveCounterMatrix = (data) => {
  saveToStorage(STORAGE_KEYS.COUNTER_MATRIX, data);
};

// 读取克制关系矩阵
export const loadCounterMatrix = () => {
  const lastUpdate = loadFromStorage(STORAGE_KEYS.LAST_UPDATE);
  if (isDataExpired(lastUpdate)) {
    return null;
  }
  return loadFromStorage(STORAGE_KEYS.COUNTER_MATRIX);
};

// 保存玩家数据缓存
export const savePlayerCache = (playerId, data) => {
  const cache = loadFromStorage(STORAGE_KEYS.PLAYER_CACHE) || {};
  cache[playerId] = {
    ...data,
    fetchTime: Date.now()
  };
  saveToStorage(STORAGE_KEYS.PLAYER_CACHE, cache);
};

// 读取玩家数据缓存
export const loadPlayerCache = (playerId) => {
  const cache = loadFromStorage(STORAGE_KEYS.PLAYER_CACHE) || {};
  const playerData = cache[playerId];
  
  // 玩家数据6小时过期
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  if (playerData && playerData.fetchTime && (Date.now() - playerData.fetchTime < SIX_HOURS)) {
    return playerData;
  }
  return null;
};

// 保存玩家配置
export const savePlayerProfiles = (profiles) => {
  saveToStorage(STORAGE_KEYS.PLAYER_PROFILES, profiles);
};

// 读取玩家配置 - 确保包含李哥
export const loadPlayerProfiles = () => {
  const defaultProfiles = {
    kai: { steamId: '139582452', name: '恺' },
    wangning: { steamId: '139877687', name: '王宁' },
    body: { steamId: '136680163', name: 'Body' },
    lige: { steamId: '139254929', name: '李哥' }
  };
  
  const savedProfiles = loadFromStorage(STORAGE_KEYS.PLAYER_PROFILES);
  
  // 如果没有保存的配置，或者缺少李哥，返回默认配置
  if (!savedProfiles || !savedProfiles.lige) {
    savePlayerProfiles(defaultProfiles);
    return defaultProfiles;
  }
  
  return savedProfiles;
};

// 清除所有缓存
export const clearAllCache = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};