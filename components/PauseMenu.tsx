import React from "react";
import { motion } from "motion/react";
import { Play, Save, Settings, Sliders, LogOut, X } from "lucide-react";

interface PauseMenuProps {
  onResume: () => void;
  onSave: () => void;
  onOpenSettings: () => void;
  onOpenOptions: () => void;
  onQuit: () => void;
}

const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onSave,
  onOpenSettings,
  onOpenOptions,
  onQuit,
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Game Paused
          </h2>
          <button
            onClick={onResume}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-2">
          <MenuButton
            icon={<Play size={18} />}
            label="Resume"
            onClick={onResume}
            primary
          />
          <MenuButton
            icon={<Save size={18} />}
            label="Load / Save"
            onClick={onSave}
          />
          <MenuButton
            icon={<Settings size={18} />}
            label="Settings"
            onClick={onOpenSettings}
          />
          <MenuButton
            icon={<Sliders size={18} />}
            label="Options"
            onClick={onOpenOptions}
          />
          <div className="my-2 border-t border-slate-800" />
          <MenuButton
            icon={<LogOut size={18} />}
            label="Quit"
            onClick={onQuit}
            danger
          />
        </div>

        <div className="p-4 bg-slate-950/50 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
            Sky Metropolis v1.2
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const MenuButton = ({ icon, label, onClick, primary, danger }: any) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-3 w-full p-4 rounded-xl font-medium transition-all duration-200
      ${
        primary
          ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20"
          : danger
            ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }
    `}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default PauseMenu;
