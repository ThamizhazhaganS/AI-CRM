"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/lib/api";
import {
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Flame,
  TrendingUp,
  Snowflake,
  Play,
  Search,
  ChevronDown,
  MessageSquare,
  Volume2
} from "lucide-react";

export default function CallLogsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    total_calls: 0,
    avg_duration_seconds: 0,
    ai_answer_rate: 100.0,
    transcripts_available: 0,
  });

  useEffect(() => {
    async function loadCallData() {
      try {
        const list = await api.getCalls();
        setCalls(list);
        const summary = await api.getCallAnalytics();
        setAnalytics(summary);
      } catch (err) {
        console.error("Failed to load call log data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCallData();
  }, []);

  const formatDuration = (secs: number) => {
    if (!secs) return "0s";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const filtered = calls.filter((log) => {
    const callerName = log.lead_name || "Unknown Caller";
    const phone = log.caller_phone || "";
    const id = log.id || "";
    
    const matchesSearch =
      callerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "All" || log.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold">Call Logs</h2>
        <p className="text-xs text-slate-400">Complete history of AI-handled incoming calls with transcripts and summaries</p>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass">
          <div className="flex items-center gap-2 mb-2">
            <PhoneIncoming className="w-4 h-4 text-electric-500" />
            <span className="text-xs text-slate-400 font-semibold">Total Calls</span>
          </div>
          <p className="text-2xl font-bold">{analytics.total_calls}</p>
        </div>
        <div className="p-4 rounded-2xl glass">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gold-500" />
            <span className="text-xs text-slate-400 font-semibold">Avg Duration</span>
          </div>
          <p className="text-2xl font-bold">{formatDuration(analytics.avg_duration_seconds)}</p>
        </div>
        <div className="p-4 rounded-2xl glass">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-slate-400 font-semibold">AI Response Rate</span>
          </div>
          <p className="text-2xl font-bold">{analytics.ai_answer_rate}%</p>
        </div>
        <div className="p-4 rounded-2xl glass">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-400 font-semibold">Transcripts Generated</span>
          </div>
          <p className="text-2xl font-bold">{analytics.transcripts_available}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 rounded-2xl bg-navy-900 border border-navy-800">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or call ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-navy-950/60 border border-navy-800 rounded-xl text-sm placeholder-slate-500 text-white focus:outline-none focus:border-electric-500 transition-colors"
          />
        </div>
        <div className="relative w-full md:w-56">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-navy-950/60 border border-navy-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-electric-500 appearance-none cursor-pointer"
          >
            <option value="All">All Categories</option>
            <option value="Hot">🔥 Hot</option>
            <option value="Warm">⚡ Warm</option>
            <option value="Cold">❄️ Cold</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Call Logs Table */}
      <div className="rounded-2xl bg-navy-900 border border-navy-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-navy-800 bg-navy-950/40 text-xs font-semibold text-slate-400 tracking-wider">
                <th className="py-4 px-6">Call ID</th>
                <th className="py-4 px-6">Caller</th>
                <th className="py-4 px-6">Duration</th>
                <th className="py-4 px-6">Date & Time</th>
                <th className="py-4 px-6 text-center">Score</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">AI Summary</th>
                <th className="py-4 px-6 text-center">Play</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span className="w-6 h-6 border-2 border-t-transparent border-electric-500 rounded-full animate-spin" />
                      <p className="text-xs text-slate-500 mt-2 font-bold">Loading call history from database...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-medium italic">
                    No call logs found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-navy-950/40 transition-colors">
                    <td className="py-4 px-6 text-xs font-mono text-slate-400">{log.id}</td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-white">{log.lead_name || "Unknown Caller"}</div>
                      <div className="text-xs text-slate-400">{log.caller_phone || "Unknown Number"}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="flex items-center gap-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {formatDuration(log.duration_seconds)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400">
                      {new Date(log.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-navy-950 border border-navy-800 font-extrabold">
                        {log.category === "Hot" ? (
                          <Flame className="w-3 h-3 text-amber-500" />
                        ) : log.category === "Warm" ? (
                          <TrendingUp className="w-3 h-3 text-electric-500" />
                        ) : (
                          <Snowflake className="w-3 h-3 text-slate-400" />
                        )}
                        <span className="text-xs">{log.score_at_call || 0}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          log.duration_seconds < 15
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : (log.score_at_call || 0) >= 50
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-navy-800 text-slate-400"
                        }`}
                      >
                        {log.duration_seconds < 15 ? "Missed" : (log.score_at_call || 0) >= 50 ? "Qualified" : "Logged"}
                      </span>
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <p className="text-xs text-slate-400 truncate italic" title={log.ai_summary}>
                        &ldquo;{log.ai_summary || "Summary generation in progress..."}&rdquo;
                      </p>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={() => log.lead_id ? router.push(`/dashboard/leads/${log.lead_id}`) : router.push('/dashboard/leads')}
                        className="p-2 rounded-lg bg-navy-800 hover:bg-electric-600 text-slate-400 hover:text-white transition-all border border-navy-700 hover:scale-105"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
