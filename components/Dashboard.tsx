import React, { useMemo } from "react";
import { motion } from "motion/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, Users, DollarSign, Activity, X } from "lucide-react";
import { CityStats, HistoryPoint } from "../types";

interface DashboardProps {
  stats: CityStats;
  history: HistoryPoint[];
  onClose: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, history, onClose }) => {
  // Use real history data or fallback if not enough
  const historyData = useMemo(() => {
    if (history.length > 5) {
      return history.map((h) => ({
        name: `Day ${h.day}`,
        revenue: h.revenue,
        profit: h.revenue * 0.5, // Estimated
        population: h.population,
      }));
    }
    // Fallback semi-random history data for visualization during early game
    return Array.from({ length: 10 }).map((_, i) => ({
      name: `Day ${stats.day - 10 + i}`,
      revenue: Math.max(0, stats.revenue - (10 - i) * 50 + Math.random() * 100),
      profit: Math.max(
        0,
        (stats.revenue - (10 - i) * 50 + Math.random() * 100) * 0.4,
      ),
      population: Math.max(
        0,
        stats.population - (10 - i) * 10 + Math.random() * 5,
      ),
    }));
  }, [stats, history]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-6xl h-[85vh] bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/40">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Metropolis Analytics
            </h2>
            <p className="text-slate-400 text-sm">
              Real-time performance and demographic tracking
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Revenue"
              value={`$${stats.revenue}`}
              icon={<TrendingUp className="text-emerald-400" />}
              sub="+12% from projected"
            />
            <StatCard
              label="Net Profit"
              value={`$${stats.profitMade}`}
              icon={<DollarSign className="text-blue-400" />}
              sub="Accumulated total"
            />
            <StatCard
              label="Population"
              value={stats.population.toString()}
              icon={<Users className="text-purple-400" />}
              sub="Global ranking: #412"
            />
            <StatCard
              label="City Age"
              value={`${stats.day} Days`}
              icon={<Activity className="text-orange-400" />}
              sub="Founding era"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSection title="Financial Growth (Revenue vs Profit)">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorRev)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#3b82f6"
                    fill="transparent"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartSection>

            <ChartSection title="Demographic Curve (Population)">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={historyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="population"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#8b5cf6",
                      strokeWidth: 2,
                      stroke: "#0f172a",
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartSection>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const StatCard = ({ label, value, icon, sub }: any) => (
  <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-2xl space-y-4">
    <div className="flex justify-between items-start">
      <div className="p-2 bg-slate-900 rounded-lg">{icon}</div>
      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        {label}
      </div>
    </div>
    <div className="space-y-1">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
  </div>
);

const ChartSection = ({ title, children }: any) => (
  <div className="bg-slate-800/30 border border-slate-700/30 p-6 rounded-2xl space-y-4">
    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
      {title}
    </h3>
    <div className="w-full">{children}</div>
  </div>
);

export default Dashboard;
