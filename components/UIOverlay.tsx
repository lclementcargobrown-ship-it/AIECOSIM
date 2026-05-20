/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef } from "react";
import {
  BuildingType,
  CityStats,
  AIGoal,
  NewsItem,
  GameSettings,
  TileData,
  Grid,
} from "../types";
import { BUILDINGS } from "../constants";
import {
  Pause,
  BarChart3,
  ChevronRight,
  Lock,
  Unlock,
  Plus,
  Minus,
  Circle,
  Undo2,
  Redo2,
  Search,
  ArrowRight,
} from "lucide-react";

interface UIOverlayProps {
  stats: CityStats;
  selectedTool: BuildingType;
  onSelectTool: (type: BuildingType) => void;
  currentGoal: AIGoal | null;
  newsFeed: NewsItem[];
  onClaimReward: () => void;
  isGeneratingGoal: boolean;
  aiEnabled: boolean;
  onOpenPause: () => void;
  onOpenDashboard: () => void;
  settings: GameSettings;
  onUpdateSettings: (s: Partial<GameSettings>) => void;
  balanceMode: "balance" | "invested" | "profit" | "revenue";
  onCycleBalance: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onMovePlayer: (dx: number, dy: number, rot: number) => void;
  searchQuery: string;
  onSearch: (s: string) => void;
  selectedTileCoords: { x: number; y: number } | null;
  onUpgradeTile: (x: number, y: number) => void;
  pendingDemolish: { x: number; y: number } | null;
  onConfirmDemolish: (x: number, y: number) => void;
  onCancelDemolish: () => void;
  grid: Grid;
}

const tools = Object.values(BuildingType).filter(
  (t) => t !== BuildingType.None,
);
const finalTools = [BuildingType.None, ...tools];

const ToolButton: React.FC<{
  type: BuildingType;
  isSelected: boolean;
  onClick: () => void;
  money: number;
  showTooltip: boolean;
  accentColor: string;
}> = ({ type, isSelected, onClick, money, showTooltip, accentColor }) => {
  const config = BUILDINGS[type];
  const canAfford = money >= config.cost;
  const isBulldoze = type === BuildingType.None;
  const bgColor = config.color;

  return (
    <div className="group relative pointer-events-auto">
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <p className="text-[10px] font-bold text-white uppercase mb-1">
            {config.name}
          </p>
          <p className="text-[9px] text-gray-400 mb-1 leading-tight">
            {config.description}
          </p>
          <div className="flex justify-between items-center text-[9px]">
            <span className="text-emerald-400 font-mono">${config.cost}</span>
            <span className="text-blue-400">+{config.incomeGen} rev</span>
          </div>
        </div>
      )}
      <button
        onClick={onClick}
        disabled={!isBulldoze && !canAfford}
        className={`
          relative flex flex-col items-center justify-center rounded-lg border-2 transition-all shadow-lg backdrop-blur-sm flex-shrink-0
          w-14 h-14 md:w-16 md:h-16
          ${isSelected ? "scale-110 z-10 bg-white/20" : "border-gray-600 bg-gray-900/80 hover:bg-gray-800"}
          ${!isBulldoze && !canAfford ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        style={isSelected ? { borderColor: accentColor } : {}}
      >
        <div
          className="w-6 h-6 md:w-8 md:h-8 rounded mb-0.5 md:mb-1 border border-black/30 shadow-inner flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: isBulldoze ? "transparent" : bgColor }}
        >
          {isBulldoze && (
            <div className="w-full h-full bg-red-600 text-white flex justify-center items-center font-bold text-base md:text-lg">
              ✕
            </div>
          )}
          {type === BuildingType.Road && (
            <div className="w-full h-2 bg-gray-800 transform -rotate-45"></div>
          )}
        </div>
        <span className="text-[7px] md:text-[9px] font-bold text-white uppercase tracking-wider drop-shadow-md leading-none">
          {config.name}
        </span>
        {config.cost > 0 && (
          <span
            className={`text-[7px] md:text-[8px] font-mono leading-none ${canAfford ? "text-green-300" : "text-red-400"}`}
          >
            ${config.cost}
          </span>
        )}
      </button>
    </div>
  );
};

const UIOverlay: React.FC<UIOverlayProps> = ({
  stats,
  selectedTool,
  onSelectTool,
  currentGoal,
  newsFeed,
  onClaimReward,
  isGeneratingGoal,
  aiEnabled,
  onOpenPause,
  onOpenDashboard,
  settings,
  onUpdateSettings,
  balanceMode,
  onCycleBalance,
  onUndo,
  onRedo,
  onMovePlayer,
  searchQuery,
  onSearch,
  selectedTileCoords,
  onUpgradeTile,
  pendingDemolish,
  onConfirmDemolish,
  onCancelDemolish,
  grid,
}) => {
  const newsRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = React.useState<string | null>(null);

  useEffect(() => {
    if (newsRef.current && settings.autoScrollNews) {
      newsRef.current.scrollTop = newsRef.current.scrollHeight;
    }
  }, [newsFeed, settings.autoScrollNews]);

  const filteredTools =
    searchQuery || filterType
      ? finalTools.filter((t) => {
          const buildInfo = BUILDINGS[t];
          if (t === BuildingType.None) return true;
          const matchesSearch =
            !searchQuery ||
            buildInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            buildInfo.description
              .toLowerCase()
              .includes(searchQuery.toLowerCase());
          const matchesFilter = !filterType || t === filterType;
          return matchesSearch && matchesFilter;
        })
      : finalTools;

  const getBalanceDisplay = () => {
    switch (balanceMode) {
      case "invested":
        return {
          label: "Invested",
          val: stats.invested,
          color: "text-orange-400",
        };
      case "profit":
        return {
          label: "Profit",
          val: stats.profitMade,
          color: "text-emerald-400",
        };
      case "revenue":
        return {
          label: "Daily Rev",
          val: stats.revenue,
          color: "text-blue-400",
        };
      default:
        return { label: "Treasury", val: stats.money, color: "text-green-400" };
    }
  };

  const bal = getBalanceDisplay();

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 md:p-4 font-sans z-10 select-none">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start pointer-events-auto gap-2 w-full">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={onOpenPause}
              className="p-3 bg-gray-900 shadow-xl border border-gray-700 rounded-xl text-white hover:bg-gray-800 pointer-events-auto"
            >
              <Pause size={18} fill="currentColor" />
            </button>
            <button
              onClick={onOpenDashboard}
              className="p-3 bg-gray-900 shadow-xl border border-gray-700 rounded-xl text-white hover:bg-gray-800 pointer-events-auto"
            >
              <BarChart3 size={18} />
            </button>
            <div
              onClick={onCycleBalance}
              className="bg-gray-900/90 text-white p-2 md:p-3 rounded-xl border border-gray-700 shadow-2xl backdrop-blur-md flex gap-3 md:gap-4 items-center flex-1 cursor-pointer hover:bg-gray-800"
            >
              <div className="flex flex-col min-w-[70px]">
                <span className="text-[8px] md:text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                  {bal.label}
                </span>
                <span
                  className={`text-base md:text-xl font-black ${bal.color} font-mono`}
                >
                  ${bal.val.toLocaleString()}
                </span>
              </div>
              <div className="w-px h-6 md:h-8 bg-gray-700"></div>
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                  Citizens
                </span>
                <span className="text-sm md:text-base font-bold text-blue-300 font-mono tracking-tight">
                  {stats.population.toLocaleString()}
                </span>
              </div>
              <div className="w-px h-6 md:h-8 bg-gray-700"></div>
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                  Power
                </span>
                <span className={`text-sm md:text-base font-bold ${stats.powerUsed > stats.powerTotal ? 'text-red-400' : 'text-yellow-400'} font-mono tracking-tight`}>
                  {stats.powerUsed}/{stats.powerTotal}
                </span>
              </div>
              <div className="w-px h-6 md:h-8 bg-gray-700"></div>
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                  Water
                </span>
                <span className={`text-sm md:text-base font-bold ${stats.waterUsed > stats.waterTotal ? 'text-red-400' : 'text-cyan-400'} font-mono tracking-tight`}>
                  {stats.waterUsed}/{stats.waterTotal}
                </span>
              </div>
              <div className="w-px h-6 md:h-8 bg-gray-700"></div>
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                  Happy
                </span>
                <span className={`text-sm md:text-base font-bold ${stats.happiness < 50 ? 'text-red-400' : 'text-green-400'} font-mono tracking-tight`}>
                  {stats.happiness}%
                </span>
              </div>
              <div className="w-px h-6 md:h-8 bg-gray-700"></div>
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                  XP
                </span>
                <span className="text-sm md:text-base font-bold text-purple-400 font-mono tracking-tight">
                  {stats.xp || 0}
                </span>
              </div>
              <div className="ml-auto flex items-center text-slate-500">
                <ChevronRight size={14} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pointer-events-auto">
            <CamButton
              active={settings.panLocked}
              onClick={() =>
                onUpdateSettings({ panLocked: !settings.panLocked })
              }
            >
              {settings.panLocked ? <Lock size={12} /> : <Unlock size={12} />}{" "}
              Pan
            </CamButton>
            <CamButton
              active={settings.camLocked}
              onClick={() =>
                onUpdateSettings({ camLocked: !settings.camLocked })
              }
            >
              {settings.camLocked ? <Lock size={12} /> : <Unlock size={12} />}{" "}
              Cam
            </CamButton>
            <div className="flex gap-1 bg-gray-900/90 border border-gray-700 rounded-lg p-1">
              <button
                onClick={onUndo}
                className="p-1 px-2 text-white hover:bg-white/10 rounded transition-colors"
                title="Undo"
              >
                <Undo2 size={12} />
              </button>
              <button
                onClick={onRedo}
                className="p-1 px-2 text-white hover:bg-white/10 rounded transition-colors"
                title="Redo"
              >
                <Redo2 size={12} />
              </button>
            </div>
            <div className="relative flex items-center bg-gray-900/90 border border-gray-700 rounded-lg px-2 text-white group focus-within:border-blue-500 transition-colors">
              <Search size={12} className="text-gray-500 mr-2" />
              <input
                type="text"
                placeholder="Search buildings..."
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] w-24 md:w-32 py-1 placeholder:text-gray-600"
              />
            </div>
          </div>

          {(searchQuery || filterType) && (
            <div className="flex gap-1 mt-1 pointer-events-auto overflow-x-auto max-w-[200px] md:max-w-none no-scrollbar">
              {["commercial", "residential", "industrial"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(filterType === f ? null : f)}
                  className={`text-[8px] px-2 py-0.5 rounded-full border transition-colors ${filterType === f ? "bg-blue-600 border-blue-400 text-white" : "bg-gray-800 border-gray-600 text-gray-400 hover:text-white"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className={`w-full md:w-72 bg-indigo-900/90 text-white rounded-xl border border-indigo-500/50 shadow-xl backdrop-blur-md overflow-hidden ${!aiEnabled ? "opacity-80 grayscale-[0.3]" : ""}`}
        >
          <div className="bg-indigo-800/80 px-3 py-1.5 flex justify-between items-center border-b border-indigo-600">
            <span className="font-bold uppercase text-[9px] tracking-widest flex items-center gap-2">
              {aiEnabled ? (
                <>
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: settings.secondaryColor }}
                  />
                  Advisor
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Sandbox
                </>
              )}
            </span>
          </div>
          <div className="p-3">
            {aiEnabled ? (
              currentGoal ? (
                <>
                  <p className="text-xs font-medium text-indigo-100 mb-2 leading-tight">
                    "{currentGoal.description}"
                  </p>
                  <div
                    className="flex justify-between items-center bg-indigo-950/60 p-1.5 rounded-lg border border-indigo-700/50"
                    style={{ borderColor: settings.secondaryColor }}
                  >
                    <span className="text-[10px] text-gray-400 font-mono">
                      Goal:{" "}
                      <span className="text-white font-bold">
                        {currentGoal.targetValue}
                      </span>
                    </span>
                    <span
                      className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded"
                      style={{ color: settings.secondaryColor }}
                    >
                      +${currentGoal.reward}
                    </span>
                  </div>
                  {currentGoal.completed && (
                    <button
                      onClick={onClaimReward}
                      className="mt-2 w-full text-white font-bold py-1.5 rounded text-xs animate-bounce border uppercase"
                      style={{
                        backgroundColor: settings.secondaryColor,
                        borderColor: settings.secondaryColor,
                      }}
                    >
                      Claim Reward
                    </button>
                  )}
                </>
              ) : (
                <div className="text-[10px] text-indigo-300 animate-pulse">
                  Consulting advisor...
                </div>
              )
            ) : (
              <div className="text-[10px] text-indigo-200/50">
                Autonomous mode active.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demolition Confirmation */}
      {pendingDemolish && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-red-500/50 p-4 rounded-xl shadow-2xl pointer-events-auto flex flex-col items-center gap-3">
          <p className="text-white text-sm font-bold">
            Demolish this building?
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={onCancelDemolish}
              className="flex-1 px-3 py-1.5 rounded-lg bg-gray-700 text-white text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                onConfirmDemolish(pendingDemolish.x, pendingDemolish.y)
              }
              className="flex-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-bold"
            >
              Bulldoze
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Action Menu */}
      {selectedTileCoords &&
        selectedTool !== BuildingType.None &&
        selectedTool !== BuildingType.Road &&
        grid[selectedTileCoords.y][selectedTileCoords.x].buildingType !==
          BuildingType.None &&
        (() => {
          const tile = grid[selectedTileCoords.y][selectedTileCoords.x];
          const config = BUILDINGS[tile.buildingType];
          if (config.maxLevel && tile.level < config.maxLevel) {
            return (
              <div className="absolute top-[30%] left-1/2 -translate-x-1/2 pointer-events-auto flex gap-2">
                <button
                  onClick={() => onUpgradeTile(tile.x, tile.y)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-sm shadow-xl flex items-center gap-2 border border-blue-400 border-b-4 active:border-b active:translate-y-[3px] transition-all"
                >
                  <ArrowRight size={14} className="-rotate-90" />
                  Upgrade to Lv {(tile.level || 1) + 1} (${config.upgradeCost})
                </button>
              </div>
            );
          }
          return null;
        })()}

      <div className="flex flex-col-reverse md:grid md:grid-cols-3 md:items-end pointer-events-auto mt-auto gap-4">
        <div className="col-span-2 flex gap-1 md:gap-2 bg-gray-900/90 p-1 md:p-2 rounded-2xl border border-gray-700 backdrop-blur-xl shadow-2xl overflow-x-auto no-scrollbar max-w-full">
          <div className="flex gap-1 md:gap-2 px-1">
            {filteredTools.map((type) => (
              <ToolButton
                key={type}
                type={type}
                isSelected={selectedTool === type}
                onClick={() => onSelectTool(type)}
                money={stats.money}
                showTooltip={settings.showTooltips}
                accentColor={settings.secondaryColor}
              />
            ))}
          </div>
        </div>

        <div className="hidden md:flex w-full h-40 bg-black/80 text-white rounded-xl border border-gray-800 backdrop-blur-xl shadow-2xl flex-col overflow-hidden relative">
          <div className="bg-gray-800/90 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-700">
            City Feed
          </div>
          <div
            ref={newsRef}
            className="flex-1 overflow-y-auto p-3 space-y-2 text-[10px] font-mono scroll-smooth"
          >
            {newsFeed.map((news) => (
              <div
                key={news.id}
                className={`border-l-2 pl-2 py-1 ${news.type === "positive" ? "border-green-500 bg-green-900/10" : news.type === "negative" ? "border-red-500 bg-red-900/10" : "border-blue-400 bg-blue-900/10"}`}
              >
                {news.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-32 right-8 md:hidden pointer-events-auto">
        <div className="w-24 h-24 bg-gray-900/80 border border-gray-700 rounded-full flex items-center justify-center p-4 relative shadow-2xl">
          <button
            className="absolute top-1 left-1/2 -translate-x-1/2 p-2 active:bg-white/20 rounded-full"
            onPointerDown={() => onMovePlayer(0, -0.2, Math.PI)}
          >
            <ChevronRight className="-rotate-90" size={16} />
          </button>
          <button
            className="absolute bottom-1 left-1/2 -translate-x-1/2 p-2 active:bg-white/20 rounded-full"
            onPointerDown={() => onMovePlayer(0, 0.2, 0)}
          >
            <ChevronRight className="rotate-90" size={16} />
          </button>
          <button
            className="absolute left-1 top-1/2 -translate-y-1/2 p-2 active:bg-white/20 rounded-full"
            onPointerDown={() => onMovePlayer(-0.2, 0, -Math.PI / 2)}
          >
            <ChevronRight className="rotate-180" size={16} />
          </button>
          <button
            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 active:bg-white/20 rounded-full"
            onPointerDown={() => onMovePlayer(0.2, 0, Math.PI / 2)}
          >
            <ChevronRight size={16} />
          </button>
          <div className="w-8 h-8 bg-white/20 rounded-full border border-white/40 flex items-center justify-center shadow-lg active:scale-95 transition-transform pointer-events-none">
            <Circle size={12} fill="white" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-1 right-2 text-[8px] text-white/20 font-mono">
        SKY METROPOLIS v2.0
      </div>
    </div>
  );
};

const CamButton = ({ children, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${active ? "bg-blue-600 border-blue-400 text-white" : "bg-gray-900/90 border-gray-700 text-gray-400 hover:text-white"}`}
  >
    {children}
  </button>
);

const Joypad = ({ onMove }: any) => null; // Placeholder as it is inline now

export default UIOverlay;
