/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Grid,
  TileData,
  BuildingType,
  CityStats,
  AIGoal,
  NewsItem,
  HistoryPoint,
  GameState,
} from "./types";
import {
  GRID_SIZE,
  BUILDINGS,
  TICK_RATE_MS,
  INITIAL_MONEY,
  INITIAL_SETTINGS,
} from "./constants";
import IsoMap from "./components/IsoMap";
import UIOverlay from "./components/UIOverlay";
import StartScreen from "./components/StartScreen";
import PauseMenu from "./components/PauseMenu";
import SettingsMenu from "./components/SettingsMenu";
import Dashboard from "./components/Dashboard";
import { generateCityGoal, generateNewsEvent } from "./services/geminiService";
import { GameSettings, PlayerCharacter, NPC } from "./types";

// Initialize empty grid with varied terrain generation
const createInitialGrid = (size: number): Grid => {
  const grid: Grid = [];
  for (let y = 0; y < size; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < size; x++) {
      // Add visual variety with levels (1-3) based on a simple "noise" function (sine waves)
      const noise =
        Math.sin(x * 0.5) * Math.cos(y * 0.5) + Math.sin((x + y) * 0.3);
      let level = 1;
      if (noise > 0.8) level = 2; // Hill
      if (noise > 1.4) level = 3; // Mountain peak

      row.push({ x, y, buildingType: BuildingType.None, level: level });
    }
    grid.push(row);
  }
  return grid;
};

function App() {
  // --- Game State ---
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(INITIAL_SETTINGS);

  const [gridSize, setGridSize] = useState(GRID_SIZE);
  const [grid, setGrid] = useState<Grid>(() => createInitialGrid(GRID_SIZE));
  const [stats, setStats] = useState<CityStats>({
    money: INITIAL_MONEY,
    population: 0,
    day: 1,
    invested: 0,
    profitMade: 0,
    revenue: 0,
    powerTotal: 0,
    powerUsed: 0,
    waterTotal: 0,
    waterUsed: 0,
    happiness: 100,
    xp: 0,
  });
  const [selectedTool, setSelectedTool] = useState<BuildingType>(
    BuildingType.Road,
  );
  const [balanceMode, setBalanceMode] = useState<
    "balance" | "invested" | "profit" | "revenue"
  >("balance");

  // --- Character & NPC State ---
  const [player, setPlayer] = useState<PlayerCharacter>({
    x: gridSize / 2,
    y: gridSize / 2,
    rotation: 0,
    appearance: {
      skinColor: "#ffdbac",
      shirtColor: "#3b82f6",
      hairColor: "#4b2c20",
    },
    mood: "Happy",
    trait: "Ambitious",
    rank: 1,
  });
  const [npcs, setNpcs] = useState<NPC[]>([]);

  useEffect(() => {
    if (gameStarted && npcs.length === 0) {
      setNpcs([
        { id: "mayor_sec", x: 2, y: 2, type: "Advisor", mood: "Serious" },
        { id: "tourist_1", x: 5, y: 5, type: "Tourist", mood: "Excited" },
      ]);
    }
  }, [gameStarted, npcs.length]);

  const handleNPCInteraction = useCallback((npc: NPC) => {
    const lines = [
      "Our city is looking great!",
      "I wonder if we should add more parks.",
      "The traffic at the main intersection is a bit much.",
      "Beautiful day for some urban planning!",
    ];
    setNpcs((prev) =>
      prev.map((n) =>
        n.id === npc.id
          ? {
              ...n,
              speech: lines[Math.floor(Math.random() * lines.length)],
              speechTimer: 15,
            }
          : n,
      ),
    );
  }, []);
  const [searchQuery, setSearchQuery] = useState("");

  const addNewsItem = useCallback((item: NewsItem) => {
    setNewsFeed((prev) => {
      // Prevent duplicates by ID
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev.slice(-12), item]; // Keep last few
    });
  }, []);

  useEffect(() => {
    if (!searchQuery) return;
    
    // Group found buildings by type
    const foundBuildings = grid.flat().filter(
      (tile) =>
        tile.buildingType !== BuildingType.None &&
        (tile.buildingType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          BUILDINGS[tile.buildingType].name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    if (foundBuildings.length > 0) {
      const counts: Record<string, number> = {};
      foundBuildings.forEach(tile => {
        const name = BUILDINGS[tile.buildingType].name;
        counts[name] = (counts[name] || 0) + 1;
      });
      
      const details = Object.entries(counts).map(([name, count]) => `${count} ${name}`).join(', ');

      addNewsItem({
        id: `search-${Date.now()}`,
        text: `Scanner active: Found ${foundBuildings.length} structure(s) matching "${searchQuery}" (${details}).`,
        type: "neutral",
      });
    }
  }, [searchQuery, addNewsItem, grid]);

  const [showSettings, setShowSettings] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [undoStack, setUndoStack] = useState<GameState[]>([]);
  const [redoStack, setRedoStack] = useState<GameState[]>([]);
  const [selectedTileCoords, setSelectedTileCoords] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [pendingDemolish, setPendingDemolish] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [gameTime, setGameTime] = useState(0); // 0 to 2400 (representing 00:00 to 24:00)

  // --- Audio Context ---
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (settings.ambientEnabled && gameStarted && !isPaused) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(50 + Math.random() * 20, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(
        0.02 * settings.volume,
        ctx.currentTime + 2,
      );

      osc.start();
      ambientNodeRef.current = gain;
      return () => {
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        setTimeout(() => osc.stop(), 1000);
      };
    }
  }, [settings.ambientEnabled, settings.volume, gameStarted, isPaused]);

  const playSound = useCallback(
    (type: "place" | "upgrade" | "demolish" | "reward" | "click" | "error") => {
      if (!settings.soundEnabled) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.1 * settings.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      switch (type) {
        case "place":
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
          osc.type = "sine";
          break;
        case "upgrade":
          osc.frequency.setValueAtTime(523, now);
          osc.frequency.exponentialRampToValueAtTime(1046, now + 0.2);
          osc.type = "triangle";
          break;
        case "demolish":
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
          osc.type = "square";
          break;
        case "reward":
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.linearRampToValueAtTime(1760, now + 0.05);
          osc.frequency.linearRampToValueAtTime(880, now + 0.1);
          osc.type = "sine";
          break;
        case "error":
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
          osc.type = "sawtooth";
          break;
        default:
          osc.frequency.setValueAtTime(1000, now);
          osc.type = "sine";
      }

      osc.start();
      osc.stop(now + 0.5);
    },
    [settings.soundEnabled, settings.volume],
  );

  // --- Undo/Redo ---
  const saveToHistory = useCallback(() => {
    const currentState: GameState = {
      grid: [...grid.map((row) => [...row])],
      stats: { ...stats },
    };
    setUndoStack((prev) => [...prev.slice(-19), currentState]);
    setRedoStack([]);
  }, [grid, stats]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const currentState: GameState = {
      grid: [...grid.map((row) => [...row])],
      stats: { ...stats },
    };
    const prevState = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, currentState]);
    setUndoStack((prev) => prev.slice(0, -1));
    setGrid(prevState.grid);
    setStats(prevState.stats);
    playSound("click");
  }, [undoStack, grid, stats, playSound]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const currentState: GameState = {
      grid: [...grid.map((row) => [...row])],
      stats: { ...stats },
    };
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, currentState]);
    setRedoStack((prev) => prev.slice(0, -1));
    setGrid(nextState.grid);
    setStats(nextState.stats);
    playSound("click");
  }, [redoStack, grid, stats, playSound]);

  const [currentGoal, setCurrentGoal] = useState<AIGoal | null>(null);
  const [isGeneratingGoal, setIsGeneratingGoal] = useState(false);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);

  // Refs
  const gridRef = useRef(grid);
  const statsRef = useRef(stats);
  const goalRef = useRef(currentGoal);
  const aiEnabledRef = useRef(aiEnabled);
  const playerRef = useRef(player);
  const isPausedRef = useRef(isPaused);

  // Sync refs
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);
  useEffect(() => {
    goalRef.current = currentGoal;
  }, [currentGoal]);
  useEffect(() => {
    aiEnabledRef.current = aiEnabled;
  }, [aiEnabled]);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          if (battery.level < 0.2 && !battery.charging) {
            setSettings((prev) => ({
              ...prev,
              textureLevel: 0,
              lodEnabled: true,
              volumetricFog: false,
              ambientEnabled: false,
            }));
            addNewsItem({
              id: "battery-save",
              text: "Low battery detected. Power saving mode active.",
              type: "neutral",
            });
          }
        };
        battery.addEventListener("levelchange", updateBattery);
        battery.addEventListener("chargingchange", updateBattery);
        updateBattery();
      });
    }
  }, [addNewsItem]);

  const handleUpgradeTile = useCallback(
    (x: number, y: number) => {
      const tile = grid[y][x];
      if (tile.buildingType === BuildingType.None) return;
      const config = BUILDINGS[tile.buildingType];
      if (
        !config.upgradeCost ||
        (config.maxLevel && tile.level >= config.maxLevel)
      ) {
        playSound("error");
        return;
      }

      if (stats.money >= config.upgradeCost) {
        saveToHistory();
        setStats((prev) => ({
          ...prev,
          money: prev.money - config.upgradeCost!,
          invested: prev.invested + config.upgradeCost!,
        }));
        setGrid((prev) => {
          const next = prev.map((row) => [...row]);
          next[y][x] = {
            ...next[y][x],
            level: next[y][x].level + 1,
            justUpgraded: true,
          };
          return next;
        });

        // Clear the upgrade flag after animation
        setTimeout(() => {
          setGrid((prev) => {
            const next = prev.map((row) => [...row]);
            if (next[y] && next[y][x]) {
              next[y][x] = { ...next[y][x], justUpgraded: false };
            }
            return next;
          });
        }, 1000);

        addNewsItem({
          id: Date.now().toString(),
          text: `Upgraded ${config.name} to level ${tile.level + 1}!`,
          type: "positive",
        });
        playSound("upgrade");
      } else {
        addNewsItem({
          id: Date.now().toString(),
          text: "Insufficient funds for upgrade.",
          type: "negative",
        });
        playSound("error");
      }
    },
    [grid, stats.money, addNewsItem, playSound, saveToHistory],
  );

  const resizeGrid = useCallback((newSize: number) => {
    if (newSize < 5 || newSize > 30) return;
    setGridSize(newSize);
    setGrid((prev) => {
      const newGrid: Grid = [];
      for (let y = 0; y < newSize; y++) {
        const row: TileData[] = [];
        for (let x = 0; x < newSize; x++) {
          if (prev[y] && prev[y][x]) {
            row.push(prev[y][x]);
          } else {
            row.push({ x, y, buildingType: BuildingType.None, level: 1 });
          }
        }
        newGrid.push(row);
      }
      return newGrid;
    });
  }, []);

  const movePlayer = useCallback(
    (dx: number, dy: number, rotation: number) => {
      setPlayer((prev) => {
        let x = prev.x + dx;
        let y = prev.y + dy;
        x = Math.max(0, Math.min(gridSize - 1, x));
        y = Math.max(0, Math.min(gridSize - 1, y));
        return { ...prev, x, y, rotation };
      });
    },
    [gridSize],
  );

  // --- Navigation & Controls ---
  useEffect(() => {
    if (!gameStarted || isPaused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const speed = 0.2;
      if (e.key === "w" || e.key === "ArrowUp") movePlayer(0, -speed, Math.PI);
      if (e.key === "s" || e.key === "ArrowDown") movePlayer(0, speed, 0);
      if (e.key === "a" || e.key === "ArrowLeft")
        movePlayer(-speed, 0, -Math.PI / 2);
      if (e.key === "d" || e.key === "ArrowRight")
        movePlayer(speed, 0, Math.PI / 2);

      if (e.key === "Escape") setIsPaused(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted, isPaused, gridSize]);

  const fetchNewGoal = useCallback(async () => {
    if (isGeneratingGoal || !aiEnabledRef.current) return;
    setIsGeneratingGoal(true);
    // Short delay for visual effect
    await new Promise((r) => setTimeout(r, 500));

    const newGoal = await generateCityGoal(statsRef.current, gridRef.current);
    if (newGoal) {
      setCurrentGoal(newGoal);
    } else {
      // Retry soon if failed, but only if AI still enabled
      if (aiEnabledRef.current) setTimeout(fetchNewGoal, 5000);
    }
    setIsGeneratingGoal(false);
  }, [isGeneratingGoal]);

  const fetchNews = useCallback(async () => {
    // chance to fetch news per tick
    if (!aiEnabledRef.current || Math.random() > 0.15) return;
    const news = await generateNewsEvent(statsRef.current, null);
    if (news) {
      addNewsItem(news);
      const textLowerCase = news.text.toLowerCase();
      if (
        textLowerCase.includes("heavy rain") ||
        textLowerCase.includes("storm")
      ) {
        setSettings((prev) => ({
          ...prev,
          weather: "rainy",
          weatherIntensity: 0.8,
        }));
      } else if (
        textLowerCase.includes("festival") ||
        textLowerCase.includes("parade")
      ) {
        setStats((prev) => ({ ...prev, money: prev.money + 500 }));
      }
    }
  }, [addNewsItem]);

  // --- Initial Setup ---
  useEffect(() => {
    if (!gameStarted) return;

    addNewsItem({
      id: Date.now().toString(),
      text: "Welcome to SkyMetropolis. Terrain generation complete.",
      type: "positive",
    });

    if (aiEnabled) {
      // @google/genai-api-key-fix: The API key's availability is a hard requirement and should not be checked in the UI.
      fetchNewGoal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted]);

  // --- Game Loop ---
  useEffect(() => {
    if (!gameStarted) return;

    const tickRate = TICK_RATE_MS / settings.timeScale;
    const intervalId = setInterval(() => {
      if (isPausedRef.current) return;

      // 1. Calculate income/pop gen
      let dailyRevenue = 0;
      let dailyPopGrowth = 0;
      let powerSupply = 0;
      let powerDemand = 0;
      let waterSupply = 0;
      let waterDemand = 0;
      let baseHappiness = 100;
      let buildingCounts: Record<string, number> = {};

      gridRef.current.flat().forEach((tile) => {
        if (tile.buildingType !== BuildingType.None) {
          const config = BUILDINGS[tile.buildingType];
          // Scale by level
          const multiplier = 1 + (tile.level - 1) * 0.5;
          dailyRevenue += config.incomeGen * multiplier;
          dailyPopGrowth += config.popGen * multiplier;
          
          if (config.powerGen) powerSupply += config.powerGen * 1;
          if (config.waterGen) waterSupply += config.waterGen * 1;
          if (config.powerRequired) powerDemand += config.powerRequired * multiplier;
          if (config.waterRequired) waterDemand += config.waterRequired * multiplier;
          if (config.happinessGen) baseHappiness += config.happinessGen;
          
          buildingCounts[tile.buildingType] =
            (buildingCounts[tile.buildingType] || 0) + 1;
        }
      });

      // Update stats
      setStats((prev) => {
        const expenses = Math.floor(prev.population * 0.2); // Simple maintenance cost
        
        let powerRatio = powerDemand > 0 ? Math.min(1, powerSupply / powerDemand) : 1;
        let waterRatio = waterDemand > 0 ? Math.min(1, waterSupply / waterDemand) : 1;
        
        let roads = buildingCounts[BuildingType.Road] || 0;
        let trafficJamPenalty = prev.population > 500 && roads < prev.population / 20 ? 15 : 0;
        
        // Parks and Commercial provide happiness bonuses
        let parks = buildingCounts[BuildingType.Park] || 0;
        let comms = buildingCounts[BuildingType.Commercial] || 0;
        let happinessBonus = Math.floor(parks * 2 + comms * 1);
        
        let currentHappiness = Math.min(100, Math.max(0, baseHappiness + happinessBonus - (1 - powerRatio)*20 - (1 - waterRatio)*20 - trafficJamPenalty));

        // Income relies on power/water
        const netProfit = Math.floor(dailyRevenue * ((powerRatio + waterRatio) / 2) - expenses);

        let newPop = prev.population + dailyPopGrowth;
        const resCount = buildingCounts[BuildingType.Residential] || 0;
        const aptCount = buildingCounts[BuildingType.ApartmentComplex] || 0;
        const skyCount = buildingCounts[BuildingType.Skyscraper] || 0;
        const maxPop =
          resCount * 50 + (buildingCounts[BuildingType.Mansion] || 0) * 100 + aptCount * 200 + skyCount * 500;
        if (newPop > maxPop) newPop = maxPop;
        if (maxPop === 0 && prev.population > 0)
          newPop = Math.max(0, prev.population - 5);

        const newStats = {
          ...prev,
          money: prev.money + netProfit,
          population: newPop,
          day: prev.day + 1,
          invested: prev.invested,
          profitMade: prev.profitMade + (netProfit > 0 ? netProfit : 0),
          revenue: Math.floor(dailyRevenue),
          powerTotal: powerSupply,
          powerUsed: powerDemand,
          waterTotal: waterSupply,
          waterUsed: waterDemand,
          happiness: currentHappiness,
          xp: (prev.xp || 0) + 250,
        };

        // Record history
        setHistory((h) => [
          ...h.slice(-49),
          {
            day: newStats.day,
            money: newStats.money,
            population: newStats.population,
            revenue: newStats.revenue,
          },
        ]);

        // Decrement NPC speech timers
        setNpcs((prev) => {
          let changed = false;
          const next = prev.map((npc) => {
            if (npc.speechTimer && npc.speechTimer > 0) {
              changed = true;
              return { ...npc, speechTimer: npc.speechTimer - 1 };
            } else if (npc.speech) {
              changed = true;
              return { ...npc, speech: undefined, speechTimer: undefined };
            }
            return npc;
          });
          return changed ? next : prev;
        });

        // Check Goal
        const goal = goalRef.current;
        if (aiEnabledRef.current && goal && !goal.completed) {
          let isMet = false;
          if (goal.targetType === "money" && newStats.money >= goal.targetValue)
            isMet = true;
          if (
            goal.targetType === "population" &&
            newStats.population >= goal.targetValue
          )
            isMet = true;
          if (
            goal.targetType === "building_count" &&
            goal.buildingType &&
            (buildingCounts[goal.buildingType] || 0) >= goal.targetValue
          )
            isMet = true;
          if (isMet) setCurrentGoal({ ...goal, completed: true });
        }

        return newStats;
      });

      // 4. Update Game Time
      setGameTime((prev) => (prev + 10) % 2400);

      // 5. Trigger news
      fetchNews();
    }, tickRate);

    return () => clearInterval(intervalId);
  }, [fetchNews, gameStarted, settings.timeScale]);

  // --- Interaction Logic ---

  const handleTileClick = useCallback(
    (x: number, y: number) => {
      if (!gameStarted) return; // Prevent clicking through start screen

      const currentGrid = gridRef.current;
      const currentStats = statsRef.current;
      const tool = selectedTool; // Capture current tool

      if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;

      const currentTile = currentGrid[y][x];
      setSelectedTileCoords({ x, y });

      // Road Upgrade Logic: If clicking on existing road, upgrade it
      if (
        tool === BuildingType.Road &&
        currentTile.buildingType === BuildingType.Road
      ) {
        handleUpgradeTile(x, y);
        return;
      }

      // Upgrade Logic: If clicking on existing building with the same tool, upgrade it
      if (
        tool !== BuildingType.None &&
        tool !== BuildingType.Road &&
        currentTile.buildingType === tool
      ) {
        handleUpgradeTile(x, y);
        return;
      }
      const buildingConfig = BUILDINGS[tool];

      // Bulldoze logic
      if (tool === BuildingType.None) {
        if (
          currentTile.buildingType !== BuildingType.None &&
          !currentTile.demolishing
        ) {
          setPendingDemolish({ x, y });
        }
        return;
      }

      // Placement Logic
      if (currentTile.buildingType === BuildingType.None) {
        if (currentStats.money >= buildingConfig.cost) {
          saveToHistory();
          // Deduct cost
          setStats((prev) => ({
            ...prev,
            money: prev.money - buildingConfig.cost,
          }));

          // Place building
          const newGrid = currentGrid.map((row) => [...row]);
          newGrid[y][x] = { ...currentTile, buildingType: tool };
          setGrid(newGrid);
          playSound("place");
        } else {
          // Not enough money feedback
          addNewsItem({
            id: Date.now().toString() + Math.random(),
            text: `Treasury insufficient for ${buildingConfig.name}.`,
            type: "negative",
          });
          playSound("error");
        }
      }
    },
    [
      selectedTool,
      addNewsItem,
      gameStarted,
      gridSize,
      handleUpgradeTile,
      playSound,
      saveToHistory,
    ],
  );

  const handleBulldoze = useCallback(
    (x: number, y: number) => {
      const currentGrid = gridRef.current;
      const currentStats = statsRef.current;
      const currentTile = currentGrid[y][x];

      if (
        currentTile.buildingType !== BuildingType.None &&
        !currentTile.demolishing
      ) {
        const bConfig = BUILDINGS[currentTile.buildingType];
        const refund = Math.floor(bConfig.cost * 0.25);
        const demolishCost = 5;
        if (currentStats.money >= demolishCost) {
          saveToHistory();

          // Set demolishing state
          const gridWithDemo = currentGrid.map((row) => [...row]);
          gridWithDemo[y][x] = { ...currentTile, demolishing: true };
          setGrid(gridWithDemo);
          playSound("demolish");

          // Wait for animation
          setTimeout(() => {
            setGrid((prevGrid) => {
              const newGrid = prevGrid.map((row) => [...row]);
              newGrid[y][x] = {
                ...currentTile,
                buildingType: BuildingType.None,
                level: 1,
                demolishing: false,
              };
              return newGrid;
            });
            setStats((prev) => ({
              ...prev,
              money: prev.money - demolishCost + refund,
            }));
            addNewsItem({
              id: Date.now().toString(),
              text: `Demolished ${bConfig.name}. Refunded $${refund}.`,
              type: "neutral",
            });
          }, 500);
        } else {
          addNewsItem({
            id: Date.now().toString(),
            text: "Cannot afford demolition costs.",
            type: "negative",
          });
          playSound("error");
        }
      }
      setPendingDemolish(null);
    },
    [addNewsItem, playSound, saveToHistory],
  );

  const handleClaimReward = () => {
    if (currentGoal && currentGoal.completed) {
      setStats((prev) => ({ ...prev, money: prev.money + currentGoal.reward }));
      addNewsItem({
        id: Date.now().toString(),
        text: `Goal achieved! ${currentGoal.reward} deposited to treasury.`,
        type: "positive",
      });
      setCurrentGoal(null);
      fetchNewGoal();
    }
  };

  const handleStart = (enabled: boolean) => {
    setAiEnabled(enabled);
    setGameStarted(true);
    // Initialize audio context on first interaction
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden selection:bg-transparent selection:text-transparent bg-sky-900">
      {/* 3D Rendering Layer - Always visible now, providing background for start screen */}
      <IsoMap
        grid={grid}
        onTileClick={handleTileClick}
        hoveredTool={selectedTool}
        stats={stats}
        player={player}
        npcs={npcs}
        settings={settings}
        gameTime={gameTime}
        searchQuery={searchQuery}
      />

      {/* Start Screen Overlay */}
      {!gameStarted && <StartScreen onStart={handleStart} />}

      {/* UI Overlays */}
      {showSettings && (
        <SettingsMenu
          settings={settings}
          onUpdateSettings={(s) => setSettings((prev) => ({ ...prev, ...s }))}
          player={player}
          onUpdatePlayer={(p) => setPlayer((prev) => ({ ...prev, ...p }))}
          onClose={() => setShowSettings(false)}
          onResizeGrid={resizeGrid}
          gridSize={gridSize}
        />
      )}

      {showDashboard && (
        <Dashboard
          stats={stats}
          history={history}
          onClose={() => setShowDashboard(false)}
        />
      )}

      {isPaused && (
        <PauseMenu
          onResume={() => setIsPaused(false)}
          onSave={() => {
            addNewsItem({
              id: Date.now().toString(),
              text: "City state serialized. Backup complete.",
              type: "neutral",
            });
            setIsPaused(false);
          }}
          onOpenSettings={() => {
            setShowSettings(true);
            setIsPaused(false);
          }}
          onOpenOptions={() => {
            setShowSettings(true);
            setIsPaused(false);
          }}
          onQuit={() => window.location.reload()}
        />
      )}

      {/* UI Layer */}
      {gameStarted && (
        <UIOverlay
          stats={stats}
          selectedTool={selectedTool}
          onSelectTool={setSelectedTool}
          currentGoal={currentGoal}
          newsFeed={newsFeed}
          onClaimReward={handleClaimReward}
          isGeneratingGoal={isGeneratingGoal}
          aiEnabled={aiEnabled}
          onOpenPause={() => setIsPaused(true)}
          onOpenDashboard={() => setShowDashboard(true)}
          settings={settings}
          onUpdateSettings={(s) => setSettings((prev) => ({ ...prev, ...s }))}
          balanceMode={balanceMode}
          onCycleBalance={() => {
            const modes: any[] = ["balance", "invested", "profit", "revenue"];
            const idx = modes.indexOf(balanceMode);
            setBalanceMode(modes[(idx + 1) % modes.length]);
          }}
          onUndo={undo}
          onRedo={redo}
          onMovePlayer={movePlayer}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          selectedTileCoords={selectedTileCoords}
          onUpgradeTile={handleUpgradeTile}
          pendingDemolish={pendingDemolish}
          onConfirmDemolish={handleBulldoze}
          onCancelDemolish={() => setPendingDemolish(null)}
          grid={grid}
        />
      )}

      {/* CSS for animations and utility */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .mask-image-b { -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%); mask-image: linear-gradient(to bottom, transparent 0%, black 15%); }
        
        /* Vertical text for toolbar label */
        .writing-mode-vertical { writing-mode: vertical-rl; text-orientation: mixed; }
        
        /* Custom scrollbar for news */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}

export default App;
