import React, { useState, useEffect,useCallback } from 'react';
import { Brain, Zap, Dumbbell, Star, X, ChevronLeft, Users, UserX, Loader2, RefreshCw } from 'lucide-react';
import { initializeStaticData, fetchPlayerData, processHeroData } from './services/dataProcessor';
import { getHeroRecommendations, calculateTeamWinRate } from './utils/calculations';
import { savePlayerProfiles, loadPlayerProfiles } from './utils/storage';

// 英雄数据 - 保持原有的20个英雄
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
  const [modalStep, setModalStep] = useState('type');
  const [selectedType, setSelectedType] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // 新增：玩家选择相关状态
  const [currentPlayer, setCurrentPlayer] = useState(null); // null 表示"无特定玩家"
  const [playerProfiles, setPlayerProfiles] = useState(loadPlayerProfiles());
  const [showPlayerSettings, setShowPlayerSettings] = useState(false);
  
  // 新增：数据加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('正在初始化...');
  const [processedData, setProcessedData] = useState(null);
  const [playerData, setPlayerData] = useState({});
  const [error, setError] = useState(null);

  // 初始化静态数据
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        setIsLoading(true);
        setLoadingMessage('正在加载英雄数据...');
        
        const { heroStats, counterMatrix } = await initializeStaticData();
        const processed = processHeroData(heroStats, counterMatrix);
        setProcessedData(processed);
        
        setIsLoading(false);
      } catch (err) {
        console.error('加载数据失败:', err);
        setError('加载数据失败，请刷新页面重试');
        setIsLoading(false);
      }
    };
    
    loadStaticData();
  }, []);

  // 加载玩家数据
  const loadPlayerDataForProfile = useCallback(async (playerId) => {
    if (!playerProfiles[playerId]?.steamId) {
      return;
    }
    
    try {
      setLoadingMessage(`正在加载${playerProfiles[playerId].name}的数据...`);
      const data = await fetchPlayerData(playerId, playerProfiles[playerId].steamId);
      
      if (data) {
        setPlayerData(prev => ({
          ...prev,
          [playerId]: data
        }));
      }
    } catch (err) {
      console.error(`加载玩家${playerId}数据失败:`, err);
    }
  }, [playerProfiles]);

  // 切换玩家时加载数据
  useEffect(() => {
    if (currentPlayer && !playerData[currentPlayer]) {
      loadPlayerDataForProfile(currentPlayer);
   }
  }, [currentPlayer, playerData, loadPlayerDataForProfile]);

  // 更新推荐和胜率
  useEffect(() => {
    if (!processedData) return;
    
    const availableHeroes = heroesData.filter(hero => 
      !allyHeroes.some(a => a.id === hero.id) && 
      !enemyHeroes.some(e => e.id === hero.id)
    );
    
    const currentPlayerData = currentPlayer ? playerData[currentPlayer] : null;
    const hasPlayer = !!currentPlayer && !!currentPlayerData;
    
    const newRecommendations = getHeroRecommendations(
      availableHeroes,
      allyHeroes,
      enemyHeroes,
      currentPlayerData,
      processedData,
      hasPlayer
    );
    
    setRecommendations(newRecommendations);
    
    const newWinRate = calculateTeamWinRate(
      allyHeroes,
      enemyHeroes,
      currentPlayerData,
      processedData,
      hasPlayer
    );
    
    setWinRate(newWinRate);
  }, [allyHeroes, enemyHeroes, processedData, currentPlayer, playerData]);

  // 保存玩家配置
  const savePlayerConfig = () => {
    savePlayerProfiles(playerProfiles);
    setShowPlayerSettings(false);
  };

  // 更新玩家Steam ID
  const updatePlayerSteamId = (playerId, steamId) => {
    setPlayerProfiles(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        steamId: steamId
      }
    }));
  };

  // 刷新玩家数据
  const refreshPlayerData = async (playerId) => {
    if (!playerProfiles[playerId]?.steamId) {
      alert('请先设置Steam ID');
      return;
    }
    
    // 清除缓存的玩家数据
    setPlayerData(prev => {
      const newData = { ...prev };
      delete newData[playerId];
      return newData;
    });
    
    // 重新加载
    await loadPlayerDataForProfile(playerId);
  };

  // 其他原有函数保持不变...
  const openHeroSelection = (slotIndex, team) => {
    setSelectedSlot({ index: slotIndex, team });
    setModalStep('type');
    setSelectedType(null);
    setShowModal(true);
  };

  const selectHeroType = (type) => {
    setSelectedType(type);
    setModalStep('hero');
  };

  const selectHero = (hero) => {
    const currentTeam = selectedSlot.team === 'ally' ? allyHeroes : enemyHeroes;
    const otherTeam = selectedSlot.team === 'ally' ? enemyHeroes : allyHeroes;
    
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

  const closeModal = () => {
    setShowModal(false);
    setModalStep('type');
    setSelectedType(null);
    setSelectedSlot(null);
  };

  const backToTypeSelection = () => {
    setModalStep('type');
    setSelectedType(null);
  };

  const resetPick = () => {
    setAllyHeroes([]);
    setEnemyHeroes([]);
    setRecommendations([]);
    setWinRate(null);
    closeModal();
  };

  const getAvailableHeroesByType = (type) => {
    return heroesData.filter(hero => 
      hero.type === type &&
      !allyHeroes.some(h => h.id === hero.id) && 
      !enemyHeroes.some(h => h.id === hero.id)
    );
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

  // 如果正在加载，显示加载界面
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold mb-2">正在加载数据...</h2>
          <p className="text-gray-600">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 mb-4">
            <X className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            刷新页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          DOTA2 英雄选择推荐系统 v2.0
        </h1>

        {/* 玩家选择区域 */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">选择玩家</h3>
            <button
              onClick={() => setShowPlayerSettings(!showPlayerSettings)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showPlayerSettings ? '完成设置' : '设置Steam ID'}
            </button>
          </div>
          
          {/* 玩家选择按钮 */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setCurrentPlayer(null)}
              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                currentPlayer === null
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              <UserX className="w-4 h-4 inline mr-2" />
              无特定玩家
            </button>
            
            {Object.entries(playerProfiles).map(([key, profile]) => (
              <button
                key={key}
                onClick={() => setCurrentPlayer(key)}
                className={`px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                  currentPlayer === key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                <Users className="w-4 h-4" />
                {profile.name}
                {playerData[key] && (
                  <span className="text-xs bg-green-500 text-white px-1 rounded">已加载</span>
                )}
              </button>
            ))}
          </div>
          
          {/* Steam ID 设置面板 */}
          {showPlayerSettings && (
            <div className="mt-4 p-4 bg-white rounded-lg border">
              <h4 className="font-semibold mb-3">设置玩家Steam ID</h4>
              {Object.entries(playerProfiles).map(([key, profile]) => (
                <div key={key} className="mb-3 flex items-center gap-3">
                  <label className="w-20 text-sm">{profile.name}:</label>
                  <input
                    type="text"
                    placeholder="输入Steam ID (32位数字)"
                    value={profile.steamId || ''}
                    onChange={(e) => updatePlayerSteamId(key, e.target.value)}
                    className="flex-1 px-3 py-1 border rounded focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => refreshPlayerData(key)}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    disabled={!profile.steamId}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={savePlayerConfig}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                保存配置
              </button>
            </div>
          )}
        </div>

        {/* 控制面板 */}
        <div className="mb-6 flex justify-center gap-4">
          <button
            onClick={resetPick}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            重置选择
          </button>
        </div>

        {/* 已选英雄区域 - 保持原有代码 */}
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
            {currentPlayer && (
              <div className="text-center text-sm mt-2 opacity-80">
                基于{playerProfiles[currentPlayer].name}的数据计算
              </div>
            )}
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
            <div className="text-sm text-gray-600 mt-3">
              {currentPlayer ? (
                <span>推荐基于：版本胜率(35%) + 克制关系(40%) + 配合关系(15%) + 熟练度(10%)</span>
              ) : (
                <span>推荐基于：版本胜率(40%) + 克制关系(60%)</span>
              )}
            </div>
          </div>
        )}

        {/* 选择英雄模态框 - 保持原有代码 */}
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
          <h4 className="font-bold mb-2">v2.0版本更新说明：</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>集成OpenDota真实数据，包含英雄胜率和克制关系</li>
            <li>支持玩家个性化推荐，输入Steam ID获取熟练度数据</li>
            <li>动态权重调整：有玩家数据时考虑配合和熟练度，无玩家时仅基于胜率和克制</li>
            <li>数据自动缓存，减少API调用次数</li>
            <li>支持多玩家配置快速切换</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Dota2HeroPicker;