"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/app/lib/api";
import {
  Settings,
  Bot,
  Users,
  Key,
  Shield,
  Save,
  Sliders,
  Volume2,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Trash2,
  Smartphone,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Sales";
  status: "Active" | "Pending";
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"ai" | "team" | "integration">("ai");
  const [role, setRole] = useState("Admin");
  const [isMounted, setIsMounted] = useState(false);

  // ── AI Config State ──────────────────────────────────────────────────
  const [agentName, setAgentName] = useState("EstateAI Receptionist");
  const [selectedVoice, setSelectedVoice] = useState("eleven_rachel");
  const [creativity, setCreativity] = useState(0.3);
  const [systemPrompt, setSystemPrompt] = useState(
    `You are a virtual receptionist for a premier real estate firm. Your goal is to:
1. Warmly greet callers and identify their inquiry type.
2. Ask questions to capture location, budget, configuration (2BHK, 3BHK, Plot, Commercial), and purchase timeline.
3. Reference the company property directory to answer specific property queries.
4. Pitch and schedule physical site visits for Sunday afternoon.
5. Remain polite, professional, and do not make up pricing details.`
  );
  const [qualifyBudget, setQualifyBudget] = useState(true);
  const [autoSiteVisit, setAutoSiteVisit] = useState(true);
  const [whatsappFollowup, setWhatsappFollowup] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Team Management State (static defaults, real users are via auth) ──
  const [team] = useState<TeamMember[]>([
    { id: "T-01", name: "Amit Patel", email: "admin@estateai.com", role: "Admin", status: "Active" },
    { id: "T-02", name: "Suresh Kumar", email: "manager@estateai.com", role: "Manager", status: "Active" },
    { id: "T-03", name: "Kavitha Raj", email: "sales@estateai.com", role: "Sales", status: "Active" },
  ]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"Admin" | "Manager" | "Sales">("Sales");

  // ── Integration Settings State ───────────────────────────────────────
  const [twilioNumber, setTwilioNumber] = useState("+1 (555) 019-2834");
  const [openaiKey, setOpenaiKey] = useState("sk-proj-••••••••••••••••••••");
  const [elevenlabsKey, setElevenlabsKey] = useState("el-key-••••••••••••••••••••");
  const [showKeys, setShowKeys] = useState(false);

  // ── UI State ─────────────────────────────────────────────────────────
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Load settings from backend ───────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    setErrorMsg("");
    try {
      const data = await api.getSettings();
      setAgentName(data.agent_name ?? "EstateAI Receptionist");
      setSelectedVoice(data.voice_model ?? "eleven_rachel");
      setCreativity(data.temperature ?? 0.3);
      if (data.system_prompt) setSystemPrompt(data.system_prompt);
      setQualifyBudget(data.qualify_budget ?? true);
      setAutoSiteVisit(data.auto_site_visit ?? true);
      setWhatsappFollowup(data.whatsapp_followup ?? true);
    } catch (err: any) {
      console.error("Failed to load settings:", err);
      setErrorMsg("Could not connect to backend. Showing default values.");
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    setRole(localStorage.getItem("userRole") || "Admin");
    loadSettings();

    const handleRoleUpdate = () => {
      setRole(localStorage.getItem("userRole") || "Admin");
    };
    window.addEventListener("roleChanged", handleRoleUpdate);
    return () => window.removeEventListener("roleChanged", handleRoleUpdate);
  }, [loadSettings]);

  if (!isMounted) return null;

  // ── Save AI settings via PATCH ───────────────────────────────────────
  const triggerSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "Sales") {
      alert("Unauthorized: Sales role cannot modify configuration settings.");
      return;
    }
    if (role === "Manager") {
      alert("Unauthorized: Only Admins can save AI configuration.");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      await api.updateSettings({
        agent_name: agentName,
        voice_model: selectedVoice,
        temperature: creativity,
        system_prompt: systemPrompt,
        qualify_budget: qualifyBudget,
        auto_site_visit: autoSiteVisit,
        whatsapp_followup: whatsappFollowup,
      });
      setStatusMsg("Settings saved successfully. AI agent pipeline will pick up new configuration.");
    } catch (err: any) {
      console.error("Save failed:", err);
      setErrorMsg(`Failed to save: ${err.message || "Unknown error."}`);
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg(""), 4000);
    }
  };

  const handleAddTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== "Admin") {
      alert("Unauthorized: Only Admin users can invite team members.");
      return;
    }
    setStatusMsg("Invitation email dispatched to new team member.");
    setNewMemberName("");
    setNewMemberEmail("");
    setNewMemberRole("Sales");
    setTimeout(() => setStatusMsg(""), 3500);
  };

  const canEdit = role === "Admin";
  const canSave = role === "Admin";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-electric-500" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Portal Configurations</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">System Settings</h2>
          <p className="text-slate-400 text-sm">
            Tune AI agent characteristics, manage dashboard users, and configure API endpoints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh button */}
          <button
            onClick={loadSettings}
            disabled={settingsLoading}
            className="p-2 rounded-xl bg-navy-900 border border-navy-800 hover:border-electric-500/50 text-slate-400 hover:text-electric-400 transition-all"
            title="Reload settings from server"
          >
            <RefreshCw className={`w-4 h-4 ${settingsLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Tab Selection */}
          <div className="flex bg-navy-900 border border-navy-800 rounded-xl p-1 w-fit">
            <button
              onClick={() => setActiveTab("ai")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "ai"
                  ? "bg-electric-500 text-white shadow-md shadow-electric-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Personality</span>
            </button>
            <button
              onClick={() => setActiveTab("team")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "team"
                  ? "bg-electric-500 text-white shadow-md shadow-electric-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team Access</span>
            </button>
            <button
              onClick={() => setActiveTab("integration")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "integration"
                  ? "bg-electric-500 text-white shadow-md shadow-electric-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Credentials &amp; Twilio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status / Error banners */}
      {statusMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-2.5 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-2.5 text-xs font-bold">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── AI Tab ───────────────────────────────────────────────────────── */}
      {activeTab === "ai" && (
        settingsLoading ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader2 className="w-5 h-5 text-electric-500 animate-spin" />
            <p className="text-sm text-slate-400 font-semibold">Loading AI configuration from database...</p>
          </div>
        ) : (
          <form onSubmit={triggerSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main prompt & agent name */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-electric-500" />
                <span>Prompt Tuning &amp; Agent Rules</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Agent Display Name</label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    disabled={!canEdit}
                    className="w-full max-w-sm bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-electric-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Agent System Prompt Guidelines</label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={9}
                    disabled={!canEdit}
                    className="w-full bg-navy-950 border border-navy-800 rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-electric-500 leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Inject rules to control language, questions to ask, information constraints, and call endings.
                  </p>
                </div>
              </div>

              {!canEdit && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-navy-950/60 border border-navy-850">
                  <Shield className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Your role (<strong>{role}</strong>) is read-only for AI configuration. Contact an Admin to make changes.
                  </p>
                </div>
              )}
            </div>

            {/* Voice & generative parameters */}
            <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 flex flex-col justify-between">
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-gold-500" />
                  <span>Voice &amp; Generative parameters</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Synthesizer Voice Model</label>
                    <select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      disabled={!canEdit}
                      className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-300 text-xs focus:outline-none focus:border-electric-500 disabled:opacity-50"
                    >
                      <option value="eleven_rachel">Rachel (ElevenLabs - Warm Female)</option>
                      <option value="eleven_adam">Adam (ElevenLabs - Deep Male)</option>
                      <option value="eleven_charlie">Charlie (ElevenLabs - Professional Male)</option>
                      <option value="gemini_standard">Gemini Voice Standard (Conversational)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1">
                      <span>Creativity / Temperature</span>
                      <span className="text-electric-500">{creativity.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={creativity}
                      onChange={(e) => setCreativity(parseFloat(e.target.value))}
                      disabled={!canEdit}
                      className="w-full accent-electric-500 h-1 bg-navy-950 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                      <span>Deterministic (Cold)</span>
                      <span>Creative (Hot)</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-navy-850 space-y-3.5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Conversation Rules</span>

                    {[
                      { label: "Strict Budget Qualification (Mandatory)", value: qualifyBudget, setter: setQualifyBudget },
                      { label: "Proactively suggest Sunday Site Visits", value: autoSiteVisit, setter: setAutoSiteVisit },
                      { label: "Automatic WhatsApp Brochure Dispatch", value: whatsappFollowup, setter: setWhatsappFollowup },
                    ].map(({ label, value, setter }) => (
                      <label key={label} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setter(e.target.checked)}
                          disabled={!canEdit}
                          className="rounded border-navy-800 bg-navy-950 text-electric-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-xs text-slate-300 group-hover:text-slate-200 transition-colors">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSave || saving}
                className="mt-8 w-full py-2.5 bg-electric-500 hover:bg-electric-600 disabled:bg-navy-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-electric-500/10 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? "Saving..." : "Save AI Configuration"}</span>
              </button>
            </div>
          </form>
        )
      )}

      {/* ── Team Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "team" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User list */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-4">
            <h3 className="text-lg font-bold">CRM System Users</h3>
            <p className="text-xs text-slate-400 mb-4">
              Control which dashboard components are viewable or editable. Standard role rules apply.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-navy-850 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-2">Member</th>
                    <th className="py-3 px-2">Email</th>
                    <th className="py-3 px-2">Role Permissions</th>
                    <th className="py-3 px-2">Status</th>
                    {role === "Admin" && <th className="py-3 px-2 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-850">
                  {team.map((member) => (
                    <tr key={member.id} className="hover:bg-navy-950/20 text-slate-300 transition-colors">
                      <td className="py-4 px-2 font-semibold text-slate-100">{member.name}</td>
                      <td className="py-4 px-2">{member.email}</td>
                      <td className="py-4 px-2">
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide ${
                            member.role === "Admin"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : member.role === "Manager"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {member.role}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <span
                          className={`font-semibold flex items-center gap-1.5 ${
                            member.status === "Active" ? "text-emerald-400" : "text-amber-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              member.status === "Active" ? "bg-emerald-400 animate-pulse" : "bg-amber-500"
                            }`}
                          />
                          {member.status}
                        </span>
                      </td>
                      {role === "Admin" && (
                        <td className="py-4 px-2 text-right">
                          <button
                            disabled={member.email === "admin@estateai.com"}
                            className="p-1.5 bg-navy-950 hover:bg-red-500/10 text-slate-500 hover:text-red-400 border border-navy-850 rounded disabled:opacity-40"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invite box */}
          <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800">
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-electric-500" />
              <span>Invite Member</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">Admin privileges required to trigger email invitations.</p>

            <form onSubmit={handleAddTeamMember} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kavitha Raj"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  disabled={role !== "Admin"}
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2 text-slate-100 placeholder-slate-650 text-xs focus:outline-none focus:border-electric-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. kavitha@firm.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  disabled={role !== "Admin"}
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2 text-slate-100 placeholder-slate-655 text-xs focus:outline-none focus:border-electric-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">System Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  disabled={role !== "Admin"}
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2 text-slate-300 text-xs focus:outline-none focus:border-electric-500 disabled:opacity-50"
                >
                  <option value="Admin">Admin (Full Control)</option>
                  <option value="Manager">Manager (Read/Write Listings)</option>
                  <option value="Sales">Sales (Read-only, hides Cold)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={role !== "Admin"}
                className="w-full py-2 bg-electric-500 hover:bg-electric-600 disabled:bg-navy-800 disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-electric-500/10 flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Send Portal Invitation</span>
              </button>
            </form>

            {role !== "Admin" && (
              <div className="mt-4 p-3 rounded-lg bg-navy-950/60 border border-navy-850 flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 leading-normal">
                  Your current role is set to <strong>{role}</strong>. Only <strong>Admin</strong> credentials can add or invite new CRM panel users.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Integration Tab ───────────────────────────────────────────────── */}
      {activeTab === "integration" && (
        <form onSubmit={triggerSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Twilio config */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-electric-500" />
              <span>Twilio Voice Integration</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Twilio Phone Number (Inbound/Outbound)</label>
                <input
                  type="text"
                  value={twilioNumber}
                  onChange={(e) => setTwilioNumber(e.target.value)}
                  disabled={!canEdit}
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-electric-500 font-mono disabled:opacity-50"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Twilio Webhook Endpoint (REST Gateway)</label>
                <input
                  type="text"
                  readOnly
                  value="https://api.estateai.com/v1/voice/inbound"
                  className="w-full bg-navy-950/60 border border-navy-850 text-slate-400 rounded-lg p-2.5 text-xs font-mono focus:outline-none cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Copy this endpoint and paste it inside the Twilio Console under Active Phone Number Webhooks.
                </p>
              </div>
            </div>
          </div>

          {/* API keys */}
          <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 text-gold-500" />
                <span>Third Party Keys</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">OpenAI / Gemini Key</label>
                    <button
                      type="button"
                      onClick={() => setShowKeys(!showKeys)}
                      className="text-[10px] text-electric-400 hover:text-electric-500 font-semibold flex items-center gap-1"
                    >
                      {showKeys ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showKeys ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                  <input
                    type={showKeys ? "text" : "password"}
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    disabled={!canEdit}
                    className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-electric-500 font-mono disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">ElevenLabs Voice API Key</label>
                  <input
                    type={showKeys ? "text" : "password"}
                    value={elevenlabsKey}
                    onChange={(e) => setElevenlabsKey(e.target.value)}
                    disabled={!canEdit}
                    className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-electric-500 font-mono disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSave || saving}
              className="mt-8 w-full py-2.5 bg-electric-500 hover:bg-electric-600 disabled:bg-navy-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-electric-500/10 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? "Saving..." : "Save Integration Keys"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
