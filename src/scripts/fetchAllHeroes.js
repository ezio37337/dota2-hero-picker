// 临时脚本：获取所有英雄数据
// 在项目根目录运行: node src/scripts/fetchAllHeroes.js

const https = require('https');
const fs = require('fs');
const path = require('path');

// 使用 https 模块获取数据
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchAllHeroes() {
  try {
    console.log('正在从OpenDota获取英雄数据...');
    
    // 获取英雄基础数据
    const heroes = await fetchJSON('https://api.opendota.com/api/heroes');
    
    // 获取英雄统计数据（可选）
    // const heroStats = await fetchJSON('https://api.opendota.com/api/heroStats');
    
    // 创建英雄映射
    const heroMapping = {};
    const heroesData = [];
    
    // 英雄属性映射
    const attrMap = {
      'agi': '敏捷英雄',
      'str': '力量英雄',
      'int': '智力英雄',
      'all': '全才英雄',
      'universal': '全才英雄'
    };
    
    heroes.forEach(hero => {
      // 创建映射（本地化名称 -> ID）
      heroMapping[hero.localized_name] = hero.id;
      
      // 创建英雄数据
      heroesData.push({
        id: hero.id,
        name: hero.localized_name,
        type: attrMap[hero.primary_attr] || '全才英雄',
        // img: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${hero.name.replace('npc_dota_hero_', '')}.png`
      });
    });
    
    // 按类型和ID排序
    heroesData.sort((a, b) => {
      if (a.type !== b.type) {
        const typeOrder = ['力量英雄', '敏捷英雄', '智力英雄', '全才英雄'];
        return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
      }
      return a.id - b.id;
    });
    
    // 生成映射文件内容
    const mappingContent = `// 自动生成的英雄映射文件
// 生成时间: ${new Date().toISOString()}
// 数据来源: OpenDota API

export const heroMapping = ${JSON.stringify(heroMapping, null, 2)};

export const reverseHeroMapping = Object.entries(heroMapping).reduce((acc, [name, id]) => {
  acc[id] = name;
  return acc;
}, {});

export const getAllHeroIds = () => Object.values(heroMapping);
export const getHeroId = (name) => heroMapping[name];
export const getHeroName = (heroId) => reverseHeroMapping[heroId];
`;
    
    // 生成英雄数据文件内容
    const dataContent = `// 自动生成的英雄数据文件
// 生成时间: ${new Date().toISOString()}
// 数据来源: OpenDota API

export const heroesData = ${JSON.stringify(heroesData, null, 2)};

export const HERO_TYPES = {
  '智力英雄': { icon: 'Brain', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-500' },
  '敏捷英雄': { icon: 'Zap', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-500' },
  '力量英雄': { icon: 'Dumbbell', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-500' },
  '全才英雄': { icon: 'Star', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-500' }
};
`;
    
    // 确保目录存在
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(
      path.join(dataDir, 'heroMapping.generated.js'),
      mappingContent
    );
    
    fs.writeFileSync(
      path.join(dataDir, 'heroesData.generated.js'),
      dataContent
    );
    
    console.log(`成功生成 ${heroes.length} 个英雄的数据！`);
    console.log('文件已保存到:');
    console.log('- src/data/heroMapping.generated.js');
    console.log('- src/data/heroesData.generated.js');
    
    // 统计信息
    const stats = heroesData.reduce((acc, hero) => {
      acc[hero.type] = (acc[hero.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n英雄统计:');
    Object.entries(stats).forEach(([type, count]) => {
      console.log(`${type}: ${count}个`);
    });
    
    console.log('\n请手动将生成的文件内容整合到项目中！');
    
  } catch (error) {
    console.error('获取英雄数据失败:', error);
  }
}

fetchAllHeroes();