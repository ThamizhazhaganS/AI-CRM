"use client";

import React, { useState, useEffect } from "react";
import {
  PhoneCall,
  Users,
  Calendar,
  Percent,
  Flame,
  TrendingUp,
  ArrowUpRight,
  Play,
  CheckCircle,
  Clock,
  Sparkles,
  MapPin,
  CircleDollarSign,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Pie
} from "recharts";

import { api } from "@/app/lib/api";

export default function OverviewPage() {
  const router = useRouter();
  const [role, setRole] = useState<string>("Admin");
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Developer");
  const [stats, setStats] = useState({
    total_calls: 0,
    total_leads: 0,
    hot_leads: 0,
    warm_leads: 0,
    cold_leads: 0,
    site_visits_scheduled: 0,
    conversion_rate: 0.0,
    ai_answer_rate: 100.0,
  });
  const [recentCalls, setRecentCalls] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
    setRole(localStorage.getItem("userRole") || "Admin");
    setUserName(localStorage.getItem("userName") || "Developer");

    async function loadData() {
      try {
        const data = await api.getAnalyticsOverview();
        setStats(data);
        const calls = await api.getCalls();
        setRecentCalls(calls.slice(0, 4));
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const handleRoleUpdate = () => {
      setRole(localStorage.getItem("userRole") || "Admin");
      setUserName(localStorage.getItem("userName") || "Developer");
    };
    window.addEventListener("roleChanged", handleRoleUpdate);
    return () => window.removeEventListener("roleChanged", handleRoleUpdate);
  }, []);

  // Dynamically compute call volume for the last 7 days from recentCalls or mock if empty
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const callVolumeData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const name = daysOfWeek[d.getDay()];
    // Filter real calls matching this day
    const dayCalls = recentCalls.filter(c => {
      const callDate = new Date(c.created_at);
      return callDate.toDateString() === d.toDateString();
    });
    return {
      name,
      calls: dayCalls.length || Math.floor(Math.random() * 20) + 10,
      leads: dayCalls.filter(c => c.category === "Hot" || c.category === "Warm").length || Math.floor(Math.random() * 8) + 2
    };
  });

  const leadTypeData = [
    { name: "Hot Leads", value: stats.hot_leads || 1, color: "#F59E0B" },
    { name: "Warm Leads", value: stats.warm_leads || 1, color: "#3B82F6" },
    { name: "Cold Leads", value: stats.cold_leads || 1, color: "#1E2E4A" },
  ];

  if (!isMounted) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Dynamic welcome and quick metrics banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-800 border border-navy-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-electric-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl -z-10" />

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold-500 animate-spin" />
            <span className="text-xs font-bold text-gold-500 uppercase tracking-widest">Performance Summary</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, <span className="bg-gradient-to-r from-gold-400 to-white bg-clip-text text-transparent">{userName}</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-xl">
            Here's what your EstateAI Virtual Receptionist has handled. AI has responded to 100% of incoming inquiries.
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex gap-4">
          <div className="px-4 py-2 bg-navy-950/60 rounded-xl border border-navy-800/80">
            <p className="text-xs text-slate-400">AI Active Minutes</p>
            <p className="text-lg font-bold text-electric-500">{(stats.total_calls * 2.5).toFixed(0)} mins</p>
          </div>
          <div className="px-4 py-2 bg-navy-950/60 rounded-xl border border-navy-800/80">
            <p className="text-xs text-slate-400">Total Savings</p>
            <p className="text-lg font-bold text-gold-500">₹{(stats.total_calls * 150).toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* Grid of Key metrics cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="p-6 rounded-2xl glass hover:border-navy-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-400">Total Calls</span>
            <div className="p-3 bg-electric-500/10 text-electric-500 rounded-xl border border-electric-500/20">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">{stats.total_calls}</h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>AI Receptionist Live</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl glass hover:border-navy-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-400">Qualified Leads</span>
            <div className="p-3 bg-gold-500/10 text-gold-500 rounded-xl border border-gold-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">{stats.total_leads}</h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>In Supabase DB</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl glass hover:border-navy-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-400">Site Visits</span>
            <div className="p-3 bg-navy-800 text-slate-300 rounded-xl border border-navy-700">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">{stats.site_visits_scheduled}</h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Booked dynamically</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl glass hover:border-navy-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-400">Conversion Rate</span>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">{stats.conversion_rate}%</h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Visit / Lead ratio</span>
          </div>
        </div>
      </div>

      {/* Main Analysis Charting Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Volume Area Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-navy-900 border border-navy-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold">Call & Lead Traffic</h3>
              <p className="text-xs text-slate-400">Comparison of total calls received vs leads qualified</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-electric-500 rounded-full" />
                <span className="text-slate-300">Calls</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-gold-500 rounded-full" />
                <span className="text-slate-300">Leads</span>
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={callVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0b1528", borderColor: "#1e2e4a", borderRadius: "12px", color: "#fff" }} />
                <Area type="monotone" dataKey="calls" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#callsGrad)" />
                <Area type="monotone" dataKey="leads" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#leadsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Quality distribution */}
        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold">Lead Segmentation</h3>
            <p className="text-xs text-slate-400">Total qualified lead quality breakdown</p>
          </div>
          <div className="h-48 w-full relative flex items-center justify-center my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leadTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leadTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="text-2xl font-bold">486</span>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total</p>
            </div>
          </div>
          <div className="space-y-2">
            {leadTypeData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm py-1 border-b border-navy-800 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 font-medium">{item.name}</span>
                </div>
                <span className="font-bold">{item.value} <span className="text-xs font-normal text-slate-400">({Math.round(item.value / 4.86)}%)</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Recent Call activities + funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Calls Log */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Recent Call Qualified Leads</h3>
              <p className="text-xs text-slate-400">Real-time transcripts, scores and summaries from incoming calls</p>
            </div>
            <Link href="/dashboard/leads" className="text-xs font-bold text-electric-500 hover:text-electric-600 flex items-center gap-1 transition-colors">
              <span>View All Leads</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {recentCalls.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500 font-bold border border-dashed border-navy-800 rounded-2xl">
                No recent calls recorded. Once calls are processed by Twilio/AI, they will appear here.
              </div>
            ) : (
              recentCalls
                .filter((c) => role !== "Sales" || c.category !== "Cold") // Hide Cold calls from Sales
                .map((call) => (
                  <div
                    key={call.id}
                    className="p-4 rounded-xl bg-navy-950/40 hover:bg-navy-950/80 border border-navy-800 hover:border-navy-700/80 transition-all duration-200 flex flex-col md:flex-row justify-between gap-4"
                  >
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="font-bold text-base text-slate-100">{call.lead_name || "Unknown"}</h4>
                        <span className="text-xs text-slate-400 font-medium">{call.caller_phone}</span>
                        <span className="text-xs text-slate-500">• {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-gold-500" />
                          <span>{call.lead_location || "Not specified"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <CircleDollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{call.lead_budget || "No budget set"}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-navy-800 text-slate-300 text-[10px] font-bold">
                          {call.ai_intent || "General"}
                        </span>
                      </div>

                      <p className="text-slate-400 text-xs italic bg-navy-900/50 p-2.5 rounded-lg border border-navy-850">
                        "{call.ai_summary || "Transcribing and summarizing call content..."}"
                      </p>
                    </div>

                    <div className="flex md:flex-col items-center justify-between md:justify-center md:items-end gap-3 md:pl-4 md:border-l border-navy-850">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">Score</span>
                        <span
                          className={`text-sm font-extrabold px-2 py-1 rounded-md ${
                            (call.score_at_call || 0) >= 80
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          }`}
                        >
                          {call.score_at_call || 0}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          call.category === "Hot"
                            ? "bg-gradient-to-r from-red-500/20 to-orange-500/20 text-orange-400 border border-orange-500/25"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/25"
                        }`}
                      >
                        {call.category || "Cold"} Lead
                      </span>
                      <button
                        onClick={() => router.push(`/dashboard/leads`)}
                        className="p-2 rounded-lg bg-navy-800 hover:bg-electric-600 text-slate-300 hover:text-white transition-all border border-navy-700"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Lead Qualification Funnel Metrics */}
        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-6">
          <div>
            <h3 className="text-lg font-bold">Conversion Funnel</h3>
            <p className="text-xs text-slate-400">Customer progression milestones from caller to qualified visit</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Incoming Calls Handled</span>
                <span className="text-slate-200">1,424 (100%)</span>
              </div>
              <div className="h-2 bg-navy-950 rounded-full overflow-hidden">
                <div className="h-full bg-electric-500 rounded-full" style={{ width: "100%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Engaged & Profiled</span>
                <span className="text-slate-200">920 (64.6%)</span>
              </div>
              <div className="h-2 bg-navy-950 rounded-full overflow-hidden">
                <div className="h-full bg-electric-600 rounded-full" style={{ width: "64.6%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Qualified Leads Captured</span>
                <span className="text-slate-200">486 (34.1%)</span>
              </div>
              <div className="h-2 bg-navy-950 rounded-full overflow-hidden">
                <div className="h-full bg-gold-500 rounded-full" style={{ width: "34.1%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Site Visit Booked</span>
                <span className="text-slate-200">78 (5.4%)</span>
              </div>
              <div className="h-2 bg-navy-950 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "5.4%" }} />
              </div>
            </div>
          </div>

          {/* Quick tips card */}
          <div className="p-4 rounded-xl bg-navy-950/50 border border-navy-800 space-y-2">
            <h4 className="text-xs font-bold text-gold-500 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              <span>Receptionist Insight</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              34% of all hot leads called outside of standard office hours (6:00 PM – 9:00 AM). Having a 24/7 virtual receptionist prevented these leads from being lost to competitors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
