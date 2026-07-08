"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Flame,
  Snowflake,
  TrendingUp,
  MapPin,
  CircleDollarSign,
  Briefcase,
  Eye,
  ChevronDown,
  Sparkles,
  Download,
  Plus,
  X,
  Loader2,
  UserPlus,
} from "lucide-react";

import { api } from "@/app/lib/api";

// ── Add Lead Modal ─────────────────────────────────────────────────────────────
function AddLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    property_type: "Apartment",
    location: "",
    budget: "",
    timeline: "3 months",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      setError("Name and phone are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.createLead(form);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create lead.");
    } finally {
      setSaving(false);
    }
  };

  const fieldCls = "w-full bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-electric-500 transition-colors";
  const labelCls = "text-[10px] text-slate-400 uppercase font-bold block mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-lg bg-navy-900 border border-navy-800 rounded-2xl shadow-2xl shadow-black/40 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-navy-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-electric-500/15 rounded-xl border border-electric-500/20">
              <UserPlus className="w-4 h-4 text-electric-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">Add New Lead</h3>
              <p className="text-xs text-slate-400">Lead will be automatically scored by the AI engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-navy-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Full Name *</label>
              <input
                name="name"
                required
                placeholder="e.g. Rohan Sharma"
                value={form.name}
                onChange={handleChange}
                className={fieldCls}
              />
            </div>

            <div>
              <label className={labelCls}>Phone *</label>
              <input
                name="phone"
                required
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={handleChange}
                className={fieldCls}
              />
            </div>

            <div>
              <label className={labelCls}>Email</label>
              <input
                name="email"
                type="email"
                placeholder="optional"
                value={form.email}
                onChange={handleChange}
                className={fieldCls}
              />
            </div>

            <div>
              <label className={labelCls}>Property Type</label>
              <select
                name="property_type"
                value={form.property_type}
                onChange={handleChange}
                className={fieldCls}
              >
                <option>Apartment</option>
                <option>Villa</option>
                <option>Plot</option>
                <option>Commercial Office</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Location / Area</label>
              <input
                name="location"
                placeholder="e.g. OMR, Chennai"
                value={form.location}
                onChange={handleChange}
                className={fieldCls}
              />
            </div>

            <div>
              <label className={labelCls}>Budget</label>
              <input
                name="budget"
                placeholder="e.g. ₹80–95 Lakhs"
                value={form.budget}
                onChange={handleChange}
                className={fieldCls}
              />
            </div>

            <div>
              <label className={labelCls}>Purchase Timeline</label>
              <select
                name="timeline"
                value={form.timeline}
                onChange={handleChange}
                className={fieldCls}
              >
                <option>Immediate</option>
                <option>1 month</option>
                <option>2 months</option>
                <option>3 months</option>
                <option>6 months</option>
                <option>1 year</option>
                <option>Browsing</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-navy-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-navy-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-electric-500 hover:bg-electric-600 disabled:bg-navy-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-electric-500/10 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>{saving ? "Creating..." : "Create Lead"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [scoreFilter, setScoreFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [role, setRole] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLeads();
      setAllLeads(data);
    } catch (err) {
      console.error("Failed to load leads from database:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setRole(localStorage.getItem("userRole") || "Admin");
    const handleRoleUpdate = () => {
      setRole(localStorage.getItem("userRole") || "Admin");
    };
    window.addEventListener("roleChanged", handleRoleUpdate);
    loadLeads();
    return () => window.removeEventListener("roleChanged", handleRoleUpdate);
  }, [loadLeads]);

  // Filter Logic
  useEffect(() => {
    let filtered = allLeads.filter((lead) => {
      const matchesSearch =
        (lead.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phone || "").includes(searchTerm) ||
        (lead.id || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesScore = scoreFilter === "All" || lead.score_category === scoreFilter;
      const matchesType = typeFilter === "All" || lead.property_type === typeFilter;

      return matchesSearch && matchesScore && matchesType;
    });

    if (role === "Sales") {
      filtered = filtered.filter((lead) => lead.score_category !== "Cold");
    }

    setLeads(filtered);
  }, [searchTerm, scoreFilter, typeFilter, role, allLeads]);

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ["Lead ID", "Name", "Phone", "Email", "Property Type", "Location", "Budget", "Timeline", "Score", "Category", "Status", "Registered"];
    const rows = leads.map((l: any) => [
      l.id,
      l.name,
      l.phone,
      l.email || "",
      l.property_type || "",
      l.location || "",
      l.budget || "",
      l.timeline || "",
      l.score,
      l.score_category,
      l.status,
      new Date(l.created_at).toLocaleDateString("en-IN"),
    ]);
    const csvContent = [headers, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EstateAI_Leads_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onCreated={loadLeads}
        />
      )}

      <div className="space-y-6 animate-in fade-in duration-400">
        {/* Header controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Captured Leads</h2>
            <p className="text-xs text-slate-400">Qualified dynamically by AI agent based on conversation depth and intent scoring</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={leads.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-navy-900 border border-navy-800 hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold transition-all"
              title={`Export ${leads.length} leads to CSV`}
            >
              <Download className="w-4 h-4 text-gold-500" />
              <span>Export CSV ({leads.length})</span>
            </button>

            {(role === "Admin" || role === "Manager") && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-electric-500 hover:bg-electric-600 rounded-xl text-xs font-semibold text-white shadow shadow-electric-500/20 transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                <span>Add Lead</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filtering bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-navy-900 border border-navy-800">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads by name, location, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-navy-950/60 border border-navy-800 rounded-xl text-sm placeholder-slate-500 text-white focus:outline-none focus:border-electric-500 transition-colors"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-navy-950/60 border border-navy-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-electric-500 appearance-none cursor-pointer"
            >
              <option value="All">All Scores (Hot/Warm/Cold)</option>
              <option value="Hot">🔥 Hot Leads (Score &gt;= 80)</option>
              <option value="Warm">⚡ Warm Leads (Score 50-79)</option>
              <option value="Cold">❄️ Cold Leads (Score &lt; 50)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-navy-950/60 border border-navy-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-electric-500 appearance-none cursor-pointer"
            >
              <option value="All">All Properties</option>
              <option value="Apartment">Apartment</option>
              <option value="Villa">Villa</option>
              <option value="Plot">Plot</option>
              <option value="Commercial Office">Commercial Office</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Sales mode warning */}
        {role === "Sales" && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span><strong>Sales Mode active:</strong> Cold leads (score &lt; 50) have been hidden automatically. Only showing actionable hot and warm leads.</span>
          </div>
        )}

        {/* Leads Table */}
        <div className="rounded-2xl bg-navy-900 border border-navy-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-navy-800 bg-navy-950/40 text-xs font-semibold text-slate-400 tracking-wider">
                  <th className="py-4 px-6">Lead / Contact</th>
                  <th className="py-4 px-6">Requirement</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6">Budget</th>
                  <th className="py-4 px-6">Timeline</th>
                  <th className="py-4 px-6 text-center">Score</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800 text-sm text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <span className="w-6 h-6 border-2 border-t-transparent border-electric-500 rounded-full animate-spin" />
                        <p className="text-xs text-slate-500 mt-2 font-bold">Loading qualified leads from database...</p>
                      </div>
                    </td>
                  </tr>
                ) : leads.length > 0 ? (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-navy-950/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-white text-base">{lead.name}</div>
                        <div className="text-xs text-slate-400">{lead.phone}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{lead.email}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded bg-navy-800 text-slate-300 text-xs font-medium">
                          {lead.property_type || "Any Property"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gold-500" />
                          <span>{lead.location || "Not specified"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold">
                        <div className="flex items-center gap-1">
                          <CircleDollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{lead.budget || "No budget"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-300 font-medium">{lead.timeline || "Browsing"}</td>
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-950 border border-navy-800 font-extrabold text-white">
                          {lead.score_category === "Hot" ? (
                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                          ) : lead.score_category === "Warm" ? (
                            <TrendingUp className="w-3.5 h-3.5 text-electric-500" />
                          ) : (
                            <Snowflake className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{lead.score}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                            lead.status === "Site Visit Scheduled"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : lead.status === "Callback Requested"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : lead.status === "Converted"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : lead.status === "Lost"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-navy-800 text-slate-400"
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                          className="p-2 rounded-lg bg-navy-800 hover:bg-electric-600 text-slate-400 hover:text-white transition-all border border-navy-700 hover:border-electric-600 hover:scale-105"
                          title="View Full Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-navy-800 border border-navy-700">
                          <Search className="w-6 h-6 text-slate-500" />
                        </div>
                        <p className="text-slate-500 font-medium italic text-sm">No leads found matching your criteria.</p>
                        {(role === "Admin" || role === "Manager") && (
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="mt-1 flex items-center gap-1.5 px-4 py-2 bg-electric-500/10 hover:bg-electric-500/20 text-electric-400 rounded-lg text-xs font-bold border border-electric-500/20 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add your first lead
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
