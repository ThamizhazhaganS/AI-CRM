"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/app/lib/api";
import {
  PhoneCall,
  Clock,
  Coins,
  TrendingUp,
  Percent,
  Calendar,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  Activity,
  FileBarChart,
  UserCheck
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";

// Mock Data for Analytics
const monthlyTrends = [
  { name: "Jan", calls: 820, leads: 240, bookings: 35 },
  { name: "Feb", calls: 980, leads: 310, bookings: 42 },
  { name: "Mar", calls: 1150, leads: 380, bookings: 55 },
  { name: "Apr", calls: 1250, leads: 410, bookings: 62 },
  { name: "May", calls: 1380, leads: 460, bookings: 70 },
  { name: "Jun", calls: 1424, leads: 486, bookings: 78 },
];

const hourlyPeakData = [
  { hour: "9 AM", calls: 45, type: "Human Hours" },
  { hour: "11 AM", calls: 68, type: "Human Hours" },
  { hour: "1 PM", calls: 52, type: "Human Hours" },
  { hour: "3 PM", calls: 74, type: "Human Hours" },
  { hour: "5 PM", calls: 85, type: "Human Hours" },
  { hour: "7 PM", calls: 124, type: "AI Peak Hours" }, // Peak AI usage
  { hour: "9 PM", calls: 148, type: "AI Peak Hours" },
  { hour: "11 PM", calls: 95, type: "AI Peak Hours" },
  { hour: "1 AM", calls: 42, type: "AI Peak Hours" },
  { hour: "3 AM", calls: 18, type: "AI Peak Hours" },
  { hour: "5 AM", calls: 24, type: "AI Peak Hours" },
  { hour: "7 AM", calls: 38, type: "AI Peak Hours" },
];

const intentBreakdownData = [
  { name: "Pricing & Budget", value: 38, color: "#3B82F6" },
  { name: "Site Visit Schedule", value: 28, color: "#F59E0B" },
  { name: "Amenities & Layout", value: 18, color: "#10B981" },
  { name: "Location & Directions", value: 11, color: "#EC4899" },
  { name: "General / Other", value: 5, color: "#64748b" },
];

const conversionFunnelDetails = [
  { stage: "Total Incoming Calls", count: 1424, pct: 100, color: "from-blue-600 to-blue-500" },
  { stage: "Successfully Answered", count: 1424, pct: 100, color: "from-indigo-600 to-indigo-500" },
  { stage: "Engaged (Multi-turn)", count: 920, pct: 64.6, color: "from-purple-600 to-purple-500" },
  { stage: "Profiled (Needs Captured)", count: 680, pct: 47.7, color: "from-pink-600 to-pink-500" },
  { stage: "Qualified Leads (Score > 50)", count: 486, pct: 34.1, color: "from-amber-600 to-amber-500" },
  { stage: "Site Visit Scheduled", count: 78, pct: 5.4, color: "from-emerald-600 to-emerald-500" },
];

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "6m">("30d");
  const [role, setRole] = useState<string>("Admin");
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState({
    total_calls: 0,
    total_leads: 0,
    hot_leads: 0,
    warm_leads: 0,
    cold_leads: 0,
    site_visits_scheduled: 0,
    conversion_rate: 0,
    ai_answer_rate: 100,
  });
  const [callStats, setCallStats] = useState({
    avg_duration_seconds: 0,
    transcripts_available: 0,
  });
  const [dataLoading, setDataLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setDataLoading(true);
    try {
      const [overview, callSummary] = await Promise.all([
        api.getAnalyticsOverview(timeframe),
        api.getCallAnalytics(timeframe),
      ]);
      setStats(overview);
      setCallStats(callSummary);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setDataLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    setIsMounted(true);
    setRole(localStorage.getItem("userRole") || "Admin");
    loadAnalytics();

    const handleRoleUpdate = () => {
      setRole(localStorage.getItem("userRole") || "Admin");
    };
    window.addEventListener("roleChanged", handleRoleUpdate);
    return () => window.removeEventListener("roleChanged", handleRoleUpdate);
  }, [loadAnalytics]);

  if (!isMounted) return null;

  // Derived values
  const totalTalkMins = Math.round((callStats.avg_duration_seconds * stats.total_calls) / 60);
  const avgDurMins = callStats.avg_duration_seconds > 0
    ? `${Math.floor(callStats.avg_duration_seconds / 60)}m ${callStats.avg_duration_seconds % 60}s`
    : "—";
  const qualified = stats.hot_leads + stats.warm_leads;

  // Real conversion funnel from live DB
  const liveConversionFunnel = [
    { stage: "Total Incoming Calls", count: stats.total_calls, pct: 100, color: "from-blue-600 to-blue-500" },
    { stage: "Successfully Answered", count: stats.total_calls, pct: 100, color: "from-indigo-600 to-indigo-500" },
    { stage: "Profiled (Leads Created)", count: stats.total_leads, pct: stats.total_calls > 0 ? Math.round((stats.total_leads / stats.total_calls) * 100) : 0, color: "from-purple-600 to-purple-500" },
    { stage: "Qualified Leads (Hot + Warm)", count: qualified, pct: stats.total_leads > 0 ? Math.round((qualified / stats.total_leads) * 100) : 0, color: "from-amber-600 to-amber-500" },
    { stage: "Site Visit Scheduled", count: stats.site_visits_scheduled, pct: stats.total_leads > 0 ? Math.round((stats.site_visits_scheduled / stats.total_leads) * 100) : 0, color: "from-emerald-600 to-emerald-500" },
  ];

  // Dynamic trends based on timeframe
  const getMonthlyTrends = () => {
    if (timeframe === "7d") {
      return [
        { name: "Mon", calls: Math.round((stats.total_calls || 14) * 0.1), leads: Math.round((stats.total_leads || 5) * 0.1), bookings: Math.round((stats.site_visits_scheduled || 1) * 0.1) },
        { name: "Tue", calls: Math.round((stats.total_calls || 14) * 0.12), leads: Math.round((stats.total_leads || 5) * 0.12), bookings: Math.round((stats.site_visits_scheduled || 1) * 0.12) },
        { name: "Wed", calls: Math.round((stats.total_calls || 14) * 0.15), leads: Math.round((stats.total_leads || 5) * 0.15), bookings: Math.round((stats.site_visits_scheduled || 1) * 0.15) },
        { name: "Thu", calls: Math.round((stats.total_calls || 14) * 0.14), leads: Math.round((stats.total_leads || 5) * 0.14), bookings: Math.round((stats.site_visits_scheduled || 1) * 0.14) },
        { name: "Fri", calls: Math.round((stats.total_calls || 14) * 0.18), leads: Math.round((stats.total_leads || 5) * 0.18), bookings: Math.round((stats.site_visits_scheduled || 1) * 0.18) },
        { name: "Sat", calls: Math.round((stats.total_calls || 14) * 0.16), leads: Math.round((stats.total_leads || 5) * 0.16), bookings: Math.round((stats.site_visits_scheduled || 1) * 0.16) },
        { name: "Sun", calls: Math.round((stats.total_calls || 14) * 0.15), leads: Math.round((stats.total_leads || 5) * 0.15), bookings: Math.round((stats.site_visits_scheduled || 1) * 0.15) },
      ];
    }
    if (timeframe === "30d") {
      return [
        { name: "Wk 1", calls: Math.round((stats.total_calls || 60) * 0.2), leads: Math.round((stats.total_leads || 20) * 0.2), bookings: Math.round((stats.site_visits_scheduled || 4) * 0.2) },
        { name: "Wk 2", calls: Math.round((stats.total_calls || 60) * 0.25), leads: Math.round((stats.total_leads || 20) * 0.25), bookings: Math.round((stats.site_visits_scheduled || 4) * 0.25) },
        { name: "Wk 3", calls: Math.round((stats.total_calls || 60) * 0.28), leads: Math.round((stats.total_leads || 20) * 0.28), bookings: Math.round((stats.site_visits_scheduled || 4) * 0.28) },
        { name: "Wk 4", calls: Math.round((stats.total_calls || 60) * 0.27), leads: Math.round((stats.total_leads || 20) * 0.27), bookings: Math.round((stats.site_visits_scheduled || 4) * 0.27) },
      ];
    }
    // 6 Months (default)
    return [
      { name: "Jan", calls: 820, leads: 240, bookings: 35 },
      { name: "Feb", calls: 980, leads: 310, bookings: 42 },
      { name: "Mar", calls: 1150, leads: 380, bookings: 55 },
      { name: "Apr", calls: 1250, leads: 410, bookings: 62 },
      { name: "May", calls: 1380, leads: 460, bookings: 70 },
      { name: "Jun", calls: stats.total_calls || 1424, leads: stats.total_leads || 486, bookings: stats.site_visits_scheduled || 78 },
    ];
  };

  const getHourlyPeakData = () => {
    const scale = timeframe === "7d" ? 0.05 : timeframe === "30d" ? 0.25 : 1.0;
    return [
      { hour: "9 AM", calls: Math.max(Math.round(45 * scale), 1), type: "Human Hours" },
      { hour: "11 AM", calls: Math.max(Math.round(68 * scale), 1), type: "Human Hours" },
      { hour: "1 PM", calls: Math.max(Math.round(52 * scale), 1), type: "Human Hours" },
      { hour: "3 PM", calls: Math.max(Math.round(74 * scale), 1), type: "Human Hours" },
      { hour: "5 PM", calls: Math.max(Math.round(85 * scale), 1), type: "Human Hours" },
      { hour: "7 PM", calls: Math.max(Math.round(124 * scale), 2), type: "AI Peak Hours" },
      { hour: "9 PM", calls: Math.max(Math.round(148 * scale), 2), type: "AI Peak Hours" },
      { hour: "11 PM", calls: Math.max(Math.round(95 * scale), 1), type: "AI Peak Hours" },
      { hour: "1 AM", calls: Math.max(Math.round(42 * scale), 0), type: "AI Peak Hours" },
      { hour: "3 AM", calls: Math.max(Math.round(18 * scale), 0), type: "AI Peak Hours" },
      { hour: "5 AM", calls: Math.max(Math.round(24 * scale), 0), type: "AI Peak Hours" },
      { hour: "7 AM", calls: Math.max(Math.round(38 * scale), 0), type: "AI Peak Hours" },
    ];
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-electric-500" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reports & Insights</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">AI Analytics</h2>
          <p className="text-slate-400 text-sm">
            Deep dive into call performance, response patterns, and conversion channels.
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex bg-navy-900 border border-navy-800 rounded-xl p-1 w-fit self-start md:self-auto">
          {(["7d", "30d", "6m"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                timeframe === t
                  ? "bg-electric-500 text-white shadow-md shadow-electric-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t === "7d" ? "7 Days" : t === "30d" ? "30 Days" : "6 Months"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid — live data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 hover:border-navy-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-400">Total Talk Time</span>
            <div className="p-3 bg-electric-500/10 text-electric-500 rounded-xl border border-electric-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
            {dataLoading ? "—" : `${totalTalkMins} m`}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            <span>{stats.total_calls} total calls handled</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 hover:border-navy-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-400">Average Call Duration</span>
            <div className="p-3 bg-gold-500/10 text-gold-500 rounded-xl border border-gold-500/20">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
            {dataLoading ? "—" : avgDurMins}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            <span>{callStats.transcripts_available} transcripts generated</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 hover:border-navy-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-400">Site Visits Booked</span>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
            {dataLoading ? "—" : stats.site_visits_scheduled}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{stats.conversion_rate}% conversion rate</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 hover:border-navy-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-400">AI Call Answer Rate</span>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl border border-indigo-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
            {dataLoading ? "—" : `${stats.ai_answer_rate}%`}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
            <span>0 missed calls, fully automated</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Volume Trend (Monthly / Weekly) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-navy-900 border border-navy-800 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold">Inbound Growth Trend</h3>
              <p className="text-xs text-slate-400">Monthly breakdown of incoming calls, qualified leads, and bookings</p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getMonthlyTrends()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e2e4a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0b1528", borderColor: "#1e2e4a", borderRadius: "12px", color: "#fff" }} />
                <Area type="monotone" name="Total Calls" dataKey="calls" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#callsGrad)" />
                <Area type="monotone" name="Qualified Leads" dataKey="leads" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#leadsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Intent Breakdown Pie Chart */}
        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold">Caller Intent Profile</h3>
            <p className="text-xs text-slate-400">Primary purpose of calls classified by AI</p>
          </div>
          <div className="h-48 w-full relative flex items-center justify-center my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={intentBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {intentBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Primary</span>
              <p className="text-lg font-bold text-slate-100">Pricing</p>
            </div>
          </div>
          <div className="space-y-2">
            {intentBreakdownData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs py-1.5 border-b border-navy-850 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-200">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Peaks & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hourly Call Spikes (AI vs Human Hours) */}
        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 flex flex-col">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold">Hourly Call Spikes</h3>
              <p className="text-xs text-slate-400">Total calls handled throughout the day. Notice spikes in off-office hours.</p>
            </div>
            <span className="text-[10px] font-bold bg-gold-500/10 text-gold-400 border border-gold-500/20 px-2 py-0.5 rounded-md">
              AI Active 24/7
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getHourlyPeakData()} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0b1528", borderColor: "#1e2e4a", borderRadius: "12px", color: "#fff" }} />
                <Bar dataKey="calls" radius={[4, 4, 0, 0]}>
                  {hourlyPeakData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.type === "AI Peak Hours" ? "#F59E0B" : "#3B82F6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-blue-500 rounded-sm" />
              <span className="text-slate-400">Human Hours (9 AM - 6 PM)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-500 rounded-sm" />
              <span className="text-slate-400">AI Peak Hours (6 PM - 9 AM)</span>
            </div>
          </div>
        </div>

        {/* Live Conversion Funnel */}
        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-6">
          <div>
            <h3 className="text-lg font-bold">Qualification Funnel Performance</h3>
            <p className="text-xs text-slate-400">Live conversion efficiency at each phase of the virtual reception</p>
          </div>

          <div className="space-y-4">
            {liveConversionFunnel.map((stage) => (
              <div key={stage.stage} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">{stage.stage}</span>
                  <span className="text-slate-400 font-bold">{dataLoading ? "—" : stage.count} <span className="text-[10px] text-slate-500">({stage.pct}%)</span></span>
                </div>
                <div className="h-5 bg-navy-950 rounded-lg overflow-hidden border border-navy-850 p-[2px]">
                  <div
                    className={`h-full bg-gradient-to-r ${stage.color} rounded-md transition-all duration-700`}
                    style={{ width: dataLoading ? "0%" : `${Math.max(stage.pct, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-navy-950/40 border border-navy-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Overall Conversion Rate</p>
              <p className="text-lg font-bold text-emerald-400">{dataLoading ? "—" : `${stats.conversion_rate}%`}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Hot + Warm Leads</p>
              <p className="text-lg font-bold text-slate-200">{dataLoading ? "—" : qualified}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
