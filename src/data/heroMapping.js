// 英雄ID映射表
// 将你现有的英雄映射到OpenDota的英雄ID
export const heroMapping = {
  // 你的英雄数据 -> OpenDota英雄ID
  '水晶室女': 5,      // Crystal Maiden
  '谜团': 33,         // Enigma
  '祈求者': 74,       // Invoker
  '死亡先知': 43,     // Death Prophet
  '巫医': 30,         // Witch Doctor
  
  '幻影刺客': 44,     // Phantom Assassin
  '敌法师': 1,        // Anti-Mage
  '影魔': 11,         // Shadow Fiend
  '复仇之魂': 20,     // Vengeful Spirit
  '圣堂刺客': 46,     // Templar Assassin
  
  '龙骑士': 49,       // Dragon Knight
  '斧王': 2,          // Axe
  '裂魂人': 71,       // Spirit Breaker
  '军团指挥官': 104,   // Legion Commander
  '潮汐猎人': 29,     // Tidehunter
  
  '痛苦女王': 39,     // Queen of Pain
  '巫妖': 31,         // Lich
  '炸弹人': 73,       // Techies
  '暗影牧师': 27,     // Shadow Priest (Dazzle)
  '风行者': 21        // Windranger
};

// 反向映射（OpenDota ID -> 中文名）
export const reverseHeroMapping = Object.entries(heroMapping).reduce((acc, [name, id]) => {
  acc[id] = name;
  return acc;
}, {});

// 获取所有OpenDota英雄ID列表
export const getAllHeroIds = () => Object.values(heroMapping);

// 根据中文名获取OpenDota ID
export const getHeroId = (chineseName) => heroMapping[chineseName];

// 根据OpenDota ID获取中文名
export const getHeroName = (heroId) => reverseHeroMapping[heroId];