import React, { useState, useEffect } from 'react';
import { Brain, Zap, Dumbbell, Star, X, ChevronLeft } from 'lucide-react';

// 英雄数据 - 每个英雄对其他19个英雄都有克制值和合作值
const heroesData = [
  // 智力英雄
  { id: 1, name: '水晶室女', type: '智力英雄' },
  { id: 2, name: '谜团', type: '智力英雄' },
  { id: 3, name: '祈求者', type: '智力英雄' },
  { id: 4, name: '死亡先知', type: '智力英雄' },
  { id: 5, name: '巫医', type: '智力英雄' },
  
  // 敏捷英雄
  { id: 6, name: '幻影刺客', type: '敏捷英雄' },
  { id: 7, name: '敌法师', type: '敏捷英雄' },
  { id: 8, name: '影魔', type: '敏捷英雄' },
  { id: 9, name: '复仇之魂', type: '敏捷英雄' },
  { id: 10, name: '圣堂刺客', type: '敏捷英雄' },
  
  // 力量英雄
  { id: 11, name: '龙骑士', type: '力量英雄' },
  { id: 12, name: '斧王', type: '力量英雄' },
  { id: 13, name: '裂魂人', type: '力量英雄' },
  { id: 14, name: '军团指挥官', type: '力量英雄' },
  { id: 15, name: '潮汐猎人', type: '力量英雄' },
  
  // 全才英雄
  { id: 16, name: '痛苦女王', type: '全才英雄' },
  { id: 17, name: '巫妖', type: '全才英雄' },
  { id: 18, name: '炸弹人', type: '全才英雄' },
  { id: 19, name: '暗牧', type: '全才英雄' },
  { id: 20, name: '风行者', type: '全才英雄' }
];

// 生成每个英雄对其他19个英雄的克制值和合作值
const generateHeroRelations = () => {
  const relations = {};
  
  heroesData.forEach(hero => {
    relations[hero.id] = {
      counters: {}, // 对其他英雄的克制值 (0-100)
      synergies: {} // 与其他英雄的合作值 (0-100)
    };
    
    heroesData.forEach(otherHero => {
      if (hero.id !== otherHero.id) {
        // 生成克制值 (0-100，数值越高表示克制越强)
        const counterValue = Math.floor(Math.random() * 101);
        relations[hero.id].counters[otherHero.id] = counterValue;
        
        // 生成合作值 (0-100，数值越高表示配合越好)
        const synergyValue = Math.floor(Math.random() * 101);
        relations[hero.id].synergies[otherHero.id] = synergyValue;
      }
    });
  });
  
  return relations;
};

// 初始化英雄关系数据
const heroRelations = generateHeroRelations();

const HERO_TYPES = {
  '智力英雄': { icon: Brain, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-500' },
  '敏捷英雄': { icon: Zap, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-500' },
  '力量英雄': { icon: Dumbbell, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-500' },
  '全才英雄': { icon: Star, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-500' }
};

function Dota2HeroPicker() {
  const [allyHeroes, setAllyHeroes] = useState([]);
  const [enemyHeroes, setEnemyHeroes] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [winRate, setWinRate] = useState(null);
  
  // 弹窗相关状态
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState('type'); // 'type' | 'hero'
  const [selectedType, setSelectedType] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // 计算英雄推荐
  const calculateRecommendations = (allies, enemies) => {
    if (allies.length === 5) return [];

    const availableHeroes = heroesData.filter(hero => 
      !allies.some(a => a.id === hero.id) && 
      !enemies.some(e => e.id === hero.id)
    );

    const heroScores = availableHeroes.map(hero => {
      let score = 0;

      // 对敌方英雄的克制分数
      enemies.forEach(enemy => {
        const counterValue = heroRelations[hero.id].counters[enemy.id] || 0;
        score += counterValue * 0.5; // 克制值权重
      });

      // 与我方英雄的合作分数
      allies.forEach(ally => {
        const synergyValue = heroRelations[hero.id].synergies[ally.id] || 0;
        score += synergyValue * 0.4; // 合作值权重
      });

      // 英雄类型平衡分数
      const typeCounts = { '智力英雄': 0, '敏捷英雄': 0, '力量英雄': 0, '全才英雄': 0 };
      allies.forEach(ally => typeCounts[ally.type]++);
      
      if (typeCounts[hero.type] === 0) score += 30; // 缺失类型额外分数
      else if (typeCounts[hero.type] === 1) score += 15;

      // 添加随机因子避免完全相同的分数
      score += Math.random() * 5;

      return { ...hero, score: Math.round(score) };
    });

    return heroScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  // 计算胜率
  const calculateWinRate = (allies, enemies) => {
    if (allies.length !== 5 || enemies.length !== 5) return null;

    let allyScore = 0;
    let enemyScore = 0;

    // 计算我方优势分数
    allies.forEach(ally => {
      enemies.forEach(enemy => {
        // 我方对敌方的克制值
        const allyCounterValue = heroRelations[ally.id].counters[enemy.id] || 0;
        allyScore += allyCounterValue;
        
        // 敌方对我方的克制值
        const enemyCounterValue = heroRelations[enemy.id].counters[ally.id] || 0;
        enemyScore += enemyCounterValue;
      });
    });

    // 计算团队内部合作分数
    for (let i = 0; i < allies.length; i++) {
      for (let j = i + 1; j < allies.length; j++) {
        const synergy1 = heroRelations[allies[i].id].synergies[allies[j].id] || 0;
        const synergy2 = heroRelations[allies[j].id].synergies[allies[i].id] || 0;
        allyScore += (synergy1 + synergy2) / 2;
      }
    }

    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        const synergy1 = heroRelations[enemies[i].id].synergies[enemies[j].id] || 0;
        const synergy2 = heroRelations[enemies[j].id].synergies[enemies[i].id] || 0;
        enemyScore += (synergy1 + synergy2) / 2;
      }
    }

    // 英雄类型平衡加分
    const calculateTypeBalance = (team) => {
      const typeCounts = { '智力英雄': 0, '敏捷英雄': 0, '力量英雄': 0, '全才英雄': 0 };
      team.forEach(hero => typeCounts[hero.type]++);
      
      let balance = 0;
      Object.values(typeCounts).forEach(count => {
        if (count > 0) balance += 50; // 每种类型存在加分
        if (count === 1) balance += 25; // 单一英雄类型最优
      });
      
      return balance;
    };

    allyScore += calculateTypeBalance(allies);
    enemyScore += calculateTypeBalance(enemies);

    const totalScore = allyScore + enemyScore;
    const allyWinRate = totalScore > 0 ? Math.round((allyScore / totalScore) * 100) : 50;
    
    return {
      ally: Math.max(5, Math.min(95, allyWinRate)), // 限制在5-95%之间
      enemy: Math.max(5, Math.min(95, 100 - allyWinRate))
    };
  };

  // 更新推荐和胜率
  useEffect(() => {
    const newRecommendations = calculateRecommendations(allyHeroes, enemyHeroes);
    setRecommendations(newRecommendations);
    
    const newWinRate = calculateWinRate(allyHeroes, enemyHeroes);
    setWinRate(newWinRate);
  }, [allyHeroes, enemyHeroes]);

  // 打开选择模态框
  const openHeroSelection = (slotIndex, team) => {
    setSelectedSlot({ index: slotIndex, team });
    setModalStep('type');
    setSelectedType(null);
    setShowModal(true);
  };

  // 选择英雄类型
  const selectHeroType = (type) => {
    setSelectedType(type);
    setModalStep('hero');
  };

  // 选择英雄
  const selectHero = (hero) => {
    const currentTeam = selectedSlot.team === 'ally' ? allyHeroes : enemyHeroes;
    const otherTeam = selectedSlot.team === 'ally' ? enemyHeroes : allyHeroes;
    
    // 检查英雄是否已被选择
    if (currentTeam.some(h => h.id === hero.id) || otherTeam.some(h => h.id === hero.id)) {
      return;
    }

    if (selectedSlot.team === 'ally') {
      const newAllies = [...allyHeroes];
      newAllies[selectedSlot.index] = hero;
      setAllyHeroes(newAllies);
    } else {
      const newEnemies = [...enemyHeroes];
      newEnemies[selectedSlot.index] = hero;
      setEnemyHeroes(newEnemies);
    }

    closeModal();
  };

  // 移除英雄
  const removeHero = (slotIndex, team) => {
    if (team === 'ally') {
      const newAllies = [...allyHeroes];
      newAllies.splice(slotIndex, 1);
      setAllyHeroes(newAllies);
    } else {
      const newEnemies = [...enemyHeroes];
      newEnemies.splice(slotIndex, 1);
      setEnemyHeroes(newEnemies);
    }
  };

  // 关闭模态框
  const closeModal = () => {
    setShowModal(false);
    setModalStep('type');
    setSelectedType(null);
    setSelectedSlot(null);
  };

  // 返回类型选择
  const backToTypeSelection = () => {
    setModalStep('type');
    setSelectedType(null);
  };

  // 重置选择
  const resetPick = () => {
    setAllyHeroes([]);
    setEnemyHeroes([]);
    setRecommendations([]);
    setWinRate(null);
    closeModal();
  };

  // 英雄卡片组件
  const HeroCard = ({ hero, showScore = false, onClick, onRemove, slotIndex, team, isEmptySlot = false }) => {
    if (isEmptySlot) {
      return (
        <div 
          className={`p-3 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 hover:bg-opacity-70 ${
            team === 'ally' 
              ? 'border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-500' 
              : 'border-red-300 bg-red-50 hover:bg-red-100 text-red-500'
          }`}
          onClick={() => openHeroSelection(slotIndex, team)}
        >
          <div className="flex items-center justify-center h-16">
            <span className="text-sm font-medium">点击选择英雄</span>
          </div>
        </div>
      );
    }

    const TypeIcon = HERO_TYPES[hero.type].icon;
    
    return (
      <div className="relative p-3 rounded-lg border-2 border-gray-200 bg-white transition-all duration-200">
        {onRemove && (
          <button
            onClick={() => onRemove(slotIndex, team)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600 z-10"
          >
            ×
          </button>
        )}
        
        <div 
          className="cursor-pointer"
          onClick={() => onClick && onClick(hero)}
        >
          <div className="flex items-center gap-2 mb-2">
            <TypeIcon className={`w-4 h-4 ${HERO_TYPES[hero.type].color}`} />
            <span className="font-medium text-sm">{hero.name}</span>
          </div>
          
          <div className={`text-xs px-2 py-1 rounded ${HERO_TYPES[hero.type].bgColor} ${HERO_TYPES[hero.type].color}`}>
            {hero.type}
          </div>
          
          {showScore && (
            <div className="mt-2 text-xs font-bold text-purple-600">
              推荐分数: {hero.score}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 获取可用英雄
  const getAvailableHeroesByType = (type) => {
    return heroesData.filter(hero => 
      hero.type === type &&
      !allyHeroes.some(h => h.id === hero.id) && 
      !enemyHeroes.some(h => h.id === hero.id)
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          DOTA2 英雄选择推荐系统 v1.2
        </h1>

        {/* 控制面板 */}
        <div className="mb-6 flex justify-center gap-4">
          <button
            onClick={resetPick}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            重置选择
          </button>
        </div>

        {/* 已选英雄区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 我方英雄 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-blue-800">
              我方英雄 ({allyHeroes.length}/5)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 5 }).map((_, index) => {
                const hero = allyHeroes[index];
                return hero ? (
                  <HeroCard 
                    key={hero.id} 
                    hero={hero} 
                    onRemove={removeHero}
                    slotIndex={index}
                    team="ally"
                  />
                ) : (
                  <HeroCard 
                    key={`ally-empty-${index}`}
                    isEmptySlot={true}
                    slotIndex={index}
                    team="ally"
                  />
                );
              })}
            </div>
          </div>

          {/* 敌方英雄 */}
          <div className="bg-red-50 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-red-800">
              敌方英雄 ({enemyHeroes.length}/5)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 5 }).map((_, index) => {
                const hero = enemyHeroes[index];
                return hero ? (
                  <HeroCard 
                    key={hero.id} 
                    hero={hero} 
                    onRemove={removeHero}
                    slotIndex={index}
                    team="enemy"
                  />
                ) : (
                  <HeroCard 
                    key={`enemy-empty-${index}`}
                    isEmptySlot={true}
                    slotIndex={index}
                    team="enemy"
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* 胜率显示 */}
        {winRate && (
          <div className="mb-6 bg-gradient-to-r from-blue-500 to-red-500 p-4 rounded-lg text-white">
            <h3 className="text-xl font-bold mb-2 text-center">预测胜率</h3>
            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className="text-2xl font-bold">{winRate.ally}%</div>
                <div>我方胜率</div>
              </div>
              <div className="text-center text-xl font-bold">VS</div>
              <div className="text-center">
                <div className="text-2xl font-bold">{winRate.enemy}%</div>
                <div>敌方胜率</div>
              </div>
            </div>
          </div>
        )}

        {/* 推荐英雄 */}
        {recommendations.length > 0 && (
          <div className="mb-6 bg-green-50 p-4 rounded-lg">
            <h3 className="text-xl font-bold mb-4 text-green-800">
              推荐英雄 (为我方选择)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recommendations.map(hero => (
                <HeroCard 
                  key={hero.id} 
                  hero={hero} 
                  showScore={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* 选择英雄模态框 */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* 模态框头部 */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  {modalStep === 'hero' && (
                    <button
                      onClick={backToTypeSelection}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  <h3 className="text-lg font-bold">
                    {modalStep === 'type' 
                      ? `为${selectedSlot?.team === 'ally' ? '我方' : '敌方'}选择英雄类型` 
                      : `选择${selectedType}英雄`
                    }
                  </h3>
                </div>
                <button
                  onClick={closeModal}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                {modalStep === 'type' ? (
                  // 英雄类型选择
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(HERO_TYPES).map(([type, config]) => {
                      const TypeIcon = config.icon;
                      const availableCount = getAvailableHeroesByType(type).length;
                      
                      return (
                        <button
                          key={type}
                          onClick={() => selectHeroType(type)}
                          disabled={availableCount === 0}
                          className={`p-6 rounded-lg border-2 transition-all duration-200 ${
                            availableCount === 0
                              ? 'opacity-50 cursor-not-allowed bg-gray-100'
                              : `${config.bgColor} ${config.borderColor} hover:bg-opacity-70`
                          }`}
                        >
                          <div className="flex flex-col items-center gap-3">
                            <TypeIcon className={`w-8 h-8 ${config.color}`} />
                            <div className="text-center">
                              <div className={`font-bold ${config.color}`}>{type}</div>
                              <div className="text-sm text-gray-600">
                                {availableCount} 个可选
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // 英雄选择
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {getAvailableHeroesByType(selectedType).map(hero => (
                      <HeroCard 
                        key={hero.id} 
                        hero={hero} 
                        onClick={selectHero}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 说明 */}
        <div className="mt-6 text-sm text-gray-600 bg-gray-100 p-4 rounded-lg">
          <h4 className="font-bold mb-2">v1.2版本更新说明：</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>优化选择流程：点击空位 → 选择英雄类型 → 选择具体英雄</li>
            <li>移除了底部英雄池，采用弹窗式选择界面</li>
            <li>支持分类型浏览和选择英雄，提升用户体验</li>
            <li>保留推荐算法和胜率计算功能</li>
            <li>可随时移除已选英雄，支持重新选择</li>
            <li>显示每个类型的可选英雄数量</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Dota2HeroPicker;