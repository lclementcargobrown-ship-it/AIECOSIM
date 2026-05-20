import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Monitor,
  Cpu,
  Volume2,
  User,
  Palette,
  Grid as GridIcon,
  Map as MapIcon,
  X,
  Check,
} from "lucide-react";
import { GameSettings, PlayerCharacter } from "../types";

interface SettingsMenuProps {
  settings: GameSettings;
  onUpdateSettings: (s: Partial<GameSettings>) => void;
  player: PlayerCharacter;
  onUpdatePlayer: (p: Partial<PlayerCharacter>) => void;
  onClose: () => void;
  onResizeGrid: (size: number) => void;
  gridSize: number;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  settings,
  onUpdateSettings,
  player,
  onUpdatePlayer,
  onClose,
  onResizeGrid,
  gridSize,
}) => {
  const [activeTab, setActiveTab] = useState<
    "display" | "audio" | "game" | "character" | "theme"
  >("display");

  const tabs = [
    { id: "display", label: "Display", icon: <Monitor size={16} /> },
    { id: "audio", label: "Audio", icon: <Volume2 size={16} /> },
    { id: "game", label: "Game", icon: <Cpu size={16} /> },
    { id: "theme", label: "Theme", icon: <Palette size={16} /> },
    { id: "character", label: "Character", icon: <User size={16} /> },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-4xl h-[80vh] bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/40">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              System Configuration
            </h2>
            <p className="text-slate-400 text-sm">
              Tune your metropolis experience
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-slate-800 bg-slate-950/20 p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-xl transition-all
                  ${activeTab === tab.id ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}
                `}
              >
                {tab.icon}
                <span className="font-medium text-sm">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-active"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-950/10">
            <AnimatePresence mode="wait">
              {activeTab === "display" && (
                <motion.div
                  key="display"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-8"
                >
                  <Section title="Visual Quality">
                    <Option
                      label="Render Resolution"
                      sub="Quality of 3D processing"
                    >
                      <select
                        value={settings.display}
                        onChange={(e) =>
                          onUpdateSettings({ display: e.target.value as any })
                        }
                        className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="high">Ultra High Def</option>
                        <option value="standard">Standard HD</option>
                        <option value="minimal">Battery Saver</option>
                      </select>
                    </Option>
                    <Option
                      label="Graphics Quality"
                      sub="Overall visual fidelity"
                    >
                      <select
                        value={settings.graphicsQuality}
                        onChange={(e) =>
                          onUpdateSettings({
                            graphicsQuality: e.target.value as any,
                          })
                        }
                        className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="high">High</option>
                        <option value="med">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </Option>
                    <Option label="Shadow Quality" sub="Resolution of cast shadows">
                      <select
                        value={settings.shadowQuality || 'low'}
                        onChange={(e) =>
                          onUpdateSettings({
                            shadowQuality: e.target.value as any,
                          })
                        }
                        className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="high">High</option>
                        <option value="med">Medium</option>
                        <option value="low">Low</option>
                        <option value="off">Off</option>
                      </select>
                    </Option>
                    <Option label="Shadow Darkness" sub="Opacity of shadows">
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={settings.shadowDarkness ?? 0.5}
                            onChange={(e) =>
                              onUpdateSettings({
                                shadowDarkness: parseFloat(e.target.value),
                              })
                            }
                            className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                          <span className="text-white text-xs font-mono">
                            {Math.round((settings.shadowDarkness ?? 0.5) * 100)}%
                          </span>
                        </div>
                    </Option>
                    <Option label="Anti-Aliasing" sub="Smooth jagged edges">
                      <button
                        onClick={() => onUpdateSettings({ antiAliasing: !settings.antiAliasing })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.antiAliasing ? "bg-blue-600" : "bg-slate-700"}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.antiAliasing ? "translate-x-7" : "translate-x-1"}`} />
                      </button>
                    </Option>
                    <Option label="Reflections" sub="Enable environment reflections">
                      <button
                        onClick={() => onUpdateSettings({ reflections: !settings.reflections })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.reflections ? "bg-blue-600" : "bg-slate-700"}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.reflections ? "translate-x-7" : "translate-x-1"}`} />
                      </button>
                    </Option>
                    <Option label="Texture Level" sub="Building detail">
                      <select
                        value={settings.textureLevel}
                        onChange={(e) =>
                          onUpdateSettings({
                            textureLevel: Number(e.target.value),
                          })
                        }
                        className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={2}>High (2)</option>
                        <option value={1}>Medium (1)</option>
                        <option value={0}>Low (0)</option>
                      </select>
                    </Option>
                    <Option label="FPS Limit" sub="Maximum frames per second">
                      <div className="flex gap-2">
                        {[30, 60, 120].map((fps) => (
                          <button
                            key={fps}
                            onClick={() => onUpdateSettings({ fpsLimit: fps })}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${settings.fpsLimit === fps ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
                          >
                            {fps}
                          </button>
                        ))}
                      </div>
                    </Option>
                    <Option label="Camera Zoom Sensitivity" sub="Speed of camera zoom">
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0.1"
                          max="2"
                          step="0.1"
                          value={settings.cameraZoomSensitivity ?? 1}
                          onChange={(e) =>
                            onUpdateSettings({
                              cameraZoomSensitivity: parseFloat(e.target.value),
                            })
                          }
                          className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-white text-xs font-mono">
                          {((settings.cameraZoomSensitivity ?? 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </Option>
                    <Option label="Max Vehicles" sub="Adjust number of simulated cars">
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={settings.maxVehicles ?? 20}
                          onChange={(e) =>
                            onUpdateSettings({
                              maxVehicles: parseInt(e.target.value),
                            })
                          }
                          className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-white text-xs font-mono">
                          {settings.maxVehicles ?? 20}
                        </span>
                      </div>
                    </Option>
                  </Section>

                  <Section title="Lighting & Post-Processing">
                    <Option label="Volumetric Fog" sub="Enable realistic fog">
                      <button
                        onClick={() => onUpdateSettings({ volumetricFog: !settings.volumetricFog })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.volumetricFog ? "bg-blue-600" : "bg-slate-700"}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.volumetricFog ? "translate-x-7" : "translate-x-1"}`} />
                      </button>
                    </Option>
                    <Option label="Fog Density" sub="Control fog intensity">
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.1"
                          value={settings.fogDensity ?? 0.5}
                          onChange={(e) =>
                            onUpdateSettings({
                              fogDensity: parseFloat(e.target.value),
                            })
                          }
                          className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-white text-xs font-mono">
                          {((settings.fogDensity ?? 0.5) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </Option>
                    <Option label="Brightness" sub="Global brightness">
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0.1"
                          max="2"
                          step="0.1"
                          value={settings.brightness ?? 1}
                          onChange={(e) =>
                            onUpdateSettings({
                              brightness: parseFloat(e.target.value),
                            })
                          }
                          className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-white text-xs font-mono">
                          {((settings.brightness ?? 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </Option>
                    <Option label="Contrast" sub="Global contrast">
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0.1"
                          max="2"
                          step="0.1"
                          value={settings.contrast ?? 1}
                          onChange={(e) =>
                            onUpdateSettings({
                              contrast: parseFloat(e.target.value),
                            })
                          }
                          className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-white text-xs font-mono">
                          {((settings.contrast ?? 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </Option>
                    <Option label="Bloom Intensity" sub="Intensity of light bleed">
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="3"
                          step="0.1"
                          value={settings.bloomIntensity ?? 1}
                          onChange={(e) =>
                            onUpdateSettings({
                              bloomIntensity: parseFloat(e.target.value),
                            })
                          }
                          className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-white text-xs font-mono">
                          {((settings.bloomIntensity ?? 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </Option>
                    <Option label="Global Light" sub="Intensity of main light source">
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={settings.globalLight ?? 1}
                          onChange={(e) =>
                            onUpdateSettings({
                              globalLight: parseFloat(e.target.value),
                            })
                          }
                          className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-white text-xs font-mono">
                          {((settings.globalLight ?? 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </Option>
                    <Option label="Night Light" sub="City ambient light at night">
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={settings.nightLight ?? 1}
                          onChange={(e) =>
                            onUpdateSettings({
                              nightLight: parseFloat(e.target.value),
                            })
                          }
                          className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-white text-xs font-mono">
                          {((settings.nightLight ?? 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </Option>
                    <Option label="Night Darkness" sub="Sky and fog darkness at night">
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={settings.nightDarkness ?? 1}
                          onChange={(e) =>
                            onUpdateSettings({
                              nightDarkness: parseFloat(e.target.value),
                            })
                          }
                          className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-white text-xs font-mono">
                          {((settings.nightDarkness ?? 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </Option>
                  </Section>

                  <Section title="Ambience">
                    <Option
                      label="Time of Day"
                      sub="System clock synchronization"
                    >
                      <select
                        value={settings.weather}
                        onChange={(e) =>
                          onUpdateSettings({ weather: e.target.value as any })
                        }
                        className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="sunny">Sunny Midday</option>
                        <option value="cloudy">Overcast Sky</option>
                        <option value="rainy">Rainy Afternoon</option>
                        <option value="night">Neon Moonlight</option>
                      </select>
                    </Option>
                    <Option
                      label="Weather Intensity"
                      sub="Control rain and snow particles"
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={settings.weatherIntensity || 0}
                          onChange={(e) =>
                            onUpdateSettings({
                              weatherIntensity: parseFloat(e.target.value),
                            })
                          }
                          className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-white text-xs font-mono">
                          {Math.round((settings.weatherIntensity || 0) * 100)}%
                        </span>
                      </div>
                    </Option>
                    <Option
                      label="Weather Frequency"
                      sub="How often weather changes occur"
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={settings.weatherFrequency || 0}
                          onChange={(e) =>
                            onUpdateSettings({
                              weatherFrequency: parseFloat(e.target.value),
                            })
                          }
                          className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-white text-xs font-mono">
                          {Math.round((settings.weatherFrequency || 0) * 100)}%
                        </span>
                      </div>
                    </Option>
                  </Section>
                </motion.div>
              )}

              {activeTab === "theme" && (
                <motion.div
                  key="theme"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-8"
                >
                  <Section title="Interface Style">
                    <Option
                      label="Map Template Theme"
                      sub="Overall aesthetic of the metropolis"
                    >
                      <div className="flex flex-wrap gap-2">
                        {["cyber", "minimal", "modern", "dnd", "cyberpunk", "gta", "lol", "pacman", "snowbros", "cadillacs", "streetfighter", "kof", "ss13", "ss14"].map((t) => (
                          <button
                            key={t}
                            onClick={() =>
                              onUpdateSettings({ theme: t as any })
                            }
                            className={`px-4 py-3 rounded-2xl text-xs font-bold capitalize border-2 transition-all ${settings.theme === t ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-slate-800 border-transparent text-slate-400 hover:border-slate-700"}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </Option>
                    <Option label="Camera Perspective" sub="Initial view angle">
                      <select
                        value={settings.cameraPerspective}
                        onChange={(e) =>
                          onUpdateSettings({
                            cameraPerspective: e.target.value as any,
                          })
                        }
                        className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="isometric">Isometric</option>
                        <option value="topdown">Top Down</option>
                        <option value="ffp">First Person (FFP)</option>
                        <option value="ttp">Third Person (TTP)</option>
                        <option value="map">Map</option>
                      </select>
                    </Option>
                    <Option label="Orientation" sub="Screen orientation (Mobile/Tablet)">
                      <select
                        value={settings.orientation}
                        onChange={(e) =>
                          onUpdateSettings({
                            orientation: e.target.value as any,
                          })
                        }
                        className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="auto">Auto</option>
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </Option>
                    <Option
                      label="Accent Color"
                      sub="Secondary highlight for UI elements"
                    >
                      <div className="flex gap-2">
                        {[
                          "#facc15",
                          "#fb7185",
                          "#8b5cf6",
                          "#3b82f6",
                          "#10b981",
                          "#f59e0b",
                        ].map((color) => (
                          <button
                            key={color}
                            onClick={() =>
                              onUpdateSettings({ secondaryColor: color })
                            }
                            className="w-10 h-10 rounded-xl border-2 transition-transform hover:scale-110 shadow-lg"
                            style={{
                              backgroundColor: color,
                              borderColor:
                                settings.secondaryColor === color
                                  ? "white"
                                  : "transparent",
                            }}
                          />
                        ))}
                      </div>
                    </Option>
                  </Section>
                </motion.div>
              )}

              {activeTab === "character" && (
                <motion.div
                  key="char"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-8"
                >
                  <div className="flex gap-8 items-center bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <div className="w-32 h-32 bg-slate-900 rounded-2xl border border-slate-600 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20" />
                      <div className="text-4xl">👤</div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="text-xs text-blue-400 font-bold uppercase tracking-widest">
                        Player Rank {player.rank}
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        City Administrator
                      </h3>
                      <div className="flex gap-2 text-xs text-slate-400">
                        <span className="bg-slate-700 px-2 py-0.5 rounded text-white">
                          {player.mood}
                        </span>
                        <span className="bg-slate-700 px-2 py-0.5 rounded text-white">
                          {player.trait}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Section title="Appearance Design">
                    <Option label="Skin Tone" sub="Select body pigment">
                      <div className="flex gap-2">
                        {["#ffdbac", "#f1c27d", "#e0ac69", "#8d5524"].map(
                          (color) => (
                            <button
                              key={color}
                              onClick={() =>
                                onUpdatePlayer({
                                  appearance: {
                                    ...player.appearance,
                                    skinColor: color,
                                  },
                                })
                              }
                              className="w-8 h-8 rounded-full border-2 border-slate-800 shadow-sm transition-transform hover:scale-110"
                              style={{
                                backgroundColor: color,
                                borderColor:
                                  player.appearance.skinColor === color
                                    ? "white"
                                    : "transparent",
                              }}
                            />
                          ),
                        )}
                      </div>
                    </Option>
                    <Option label="Shirt Fabric" sub="Uniform color selection">
                      <div className="flex gap-2">
                        {[
                          "#3b82f6",
                          "#ef4444",
                          "#10b981",
                          "#f59e0b",
                          "#ffffff",
                          "#1f2937",
                        ].map((color) => (
                          <button
                            key={color}
                            onClick={() =>
                              onUpdatePlayer({
                                appearance: {
                                  ...player.appearance,
                                  shirtColor: color,
                                },
                              })
                            }
                            className="w-8 h-8 rounded-full border-2 border-slate-800 shadow-sm transition-transform hover:scale-110"
                            style={{
                              backgroundColor: color,
                              borderColor:
                                player.appearance.shirtColor === color
                                  ? "white"
                                  : "transparent",
                            }}
                          />
                        ))}
                      </div>
                    </Option>
                  </Section>

                  <Section title="Personal Traits">
                    <Option
                      label="Predominant Trait"
                      sub="Influences NPC interactions"
                    >
                      <select
                        value={player.trait}
                        onChange={(e) =>
                          onUpdatePlayer({ trait: e.target.value })
                        }
                        className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-2"
                      >
                        <option value="Ambitious">Ambitious (+Profit)</option>
                        <option value="Charismatic">
                          Charismatic (+Npc Happiness)
                        </option>
                        <option value="Diligent">
                          Diligent (+Building Efficiency)
                        </option>
                        <option value="Creative">Creative (+Aesthetics)</option>
                      </select>
                    </Option>
                  </Section>

                  <Section title="NPC Character Editor">
                    <Option label="Citizen Skin Tone" sub="Select default skin tone for NPCs">
                      <div className="flex gap-2">
                        {["#ffdbac", "#f1c27d", "#e0ac69", "#8d5524", "#fcd34d"].map(
                          (color) => (
                            <button
                              key={color}
                              onClick={() =>
                                onUpdateSettings({
                                  npcAppearance: {
                                    ...settings.npcAppearance,
                                    skinColor: color,
                                  },
                                })
                              }
                              className="w-8 h-8 rounded-full border-2 border-slate-800 shadow-sm transition-transform hover:scale-110"
                              style={{
                                backgroundColor: color,
                                borderColor:
                                  settings.npcAppearance?.skinColor === color
                                    ? "white"
                                    : "transparent",
                              }}
                            />
                          ),
                        )}
                      </div>
                    </Option>
                    <Option label="Advisor Uniform" sub="Set color for Advisors">
                      <div className="flex gap-2">
                        {[
                          "#3b82f6",
                          "#ef4444",
                          "#10b981",
                          "#f59e0b",
                          "#ffffff",
                          "#1f2937",
                        ].map((color) => (
                          <button
                            key={color}
                            onClick={() =>
                                onUpdateSettings({
                                  npcAppearance: {
                                    ...settings.npcAppearance,
                                    advisorColor: color,
                                  },
                                })
                            }
                            className="w-8 h-8 rounded-full border-2 border-slate-800 shadow-sm transition-transform hover:scale-110"
                            style={{
                              backgroundColor: color,
                              borderColor:
                                settings.npcAppearance?.advisorColor === color
                                  ? "white"
                                  : "transparent",
                            }}
                          />
                        ))}
                      </div>
                    </Option>
                    <Option label="Generic Worker Uniform" sub="Set color for standard NPCs">
                      <div className="flex gap-2">
                        {[
                          "#3b82f6",
                          "#ec4899",
                          "#10b981",
                          "#f59e0b",
                          "#ffffff",
                          "#1f2937",
                        ].map((color) => (
                          <button
                            key={color}
                            onClick={() =>
                                onUpdateSettings({
                                  npcAppearance: {
                                    ...settings.npcAppearance,
                                    citizenColor: color,
                                  },
                                })
                            }
                            className="w-8 h-8 rounded-full border-2 border-slate-800 shadow-sm transition-transform hover:scale-110"
                            style={{
                              backgroundColor: color,
                              borderColor:
                                settings.npcAppearance?.citizenColor === color
                                  ? "white"
                                  : "transparent",
                            }}
                          />
                        ))}
                      </div>
                    </Option>
                  </Section>
                </motion.div>
              )}

              {activeTab === "game" && (
                <motion.div
                  key="game"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-8"
                >
                  <Section title="Land Management">
                    <Option
                      label="Grid Dimensions"
                      sub="Resize the metropolis (restarts map if increased)"
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="5"
                          max="30"
                          step="5"
                          value={gridSize}
                          onChange={(e) =>
                            onResizeGrid(parseInt(e.target.value))
                          }
                          className="w-48 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-white font-mono font-bold">
                          {gridSize} x {gridSize}
                        </span>
                      </div>
                    </Option>
                  </Section>

                  <Section title="System Controls">
                    <Option
                      label="Time Compression"
                      sub="Speed of game simulation"
                    >
                      <div className="flex gap-2">
                        {[1, 2, 4, 8].map((s) => (
                          <button
                            key={s}
                            onClick={() =>
                              onUpdateSettings({ timeScale: s as any })
                            }
                            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize ${settings.timeScale === s ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"}`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </Option>
                  </Section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all leading-none"
          >
            Apply Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Section = ({ title, children }: any) => (
  <div className="space-y-4">
    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
      {title}
    </h3>
    <div className="space-y-1">{children}</div>
  </div>
);

const Option = ({ label, sub, children }: any) => (
  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-800/50 hover:bg-white/5 transition-colors">
    <div className="space-y-1">
      <div className="text-white font-bold text-sm">{label}</div>
      <div className="text-slate-500 text-xs">{sub}</div>
    </div>
    <div>{children}</div>
  </div>
);

export default SettingsMenu;
