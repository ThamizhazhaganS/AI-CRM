"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/lib/api";
import {
  Sparkles,
  PhoneCall,
  Shield,
  Zap,
  Building,
  ArrowRight,
  Database,
  Lock,
  UserCheck,
  CheckCircle,
  Clock
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@estateai.com");
  const [password, setPassword] = useState("admin123");
  const [selectedRole, setSelectedRole] = useState<"Admin" | "Manager" | "Sales">("Admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const existingRole = localStorage.getItem("userRole");
    if (existingRole === "Admin" || existingRole === "Manager" || existingRole === "Sales") {
      setSelectedRole(existingRole);
      // Auto fill based on existing role
      handleRoleChange(existingRole);
    }
  }, []);

  const handleRoleChange = (role: "Admin" | "Manager" | "Sales") => {
    setSelectedRole(role);
    if (role === "Admin") {
      setEmail("admin@estateai.com");
      setPassword("admin123");
    } else if (role === "Manager") {
      setEmail("manager@estateai.com");
      setPassword("manager123");
    } else if (role === "Sales") {
      setEmail("sales@estateai.com");
      setPassword("sales123");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const data = await api.login(email, password);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userRole", data.user.role);
      localStorage.setItem("userName", data.user.name);
      localStorage.setItem("userEmail", data.user.email);
      
      // Dispatch role change event
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("roleChanged"));
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-navy-950 font-sans selection:bg-electric-500/30 selection:text-white">
      {/* Decorative Gradient Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-electric-500/10 rounded-full blur-[140px] -z-10 animate-pulse duration-10000" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gold-500/5 rounded-full blur-[120px] -z-10 animate-pulse duration-[8000ms]" />
      
      {/* Top Navigation / Brand Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-electric-600 to-electric-400 flex items-center justify-center shadow-lg shadow-electric-500/20 border border-electric-400/30">
            <PhoneCall className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">
              Estate<span className="text-gold-500">AI</span>
            </h1>
            <span className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">Receptionist</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-400">Environment:</span>
          <span className="text-[10px] font-extrabold bg-gold-500/10 text-gold-500 border border-gold-500/20 px-2 py-0.5 rounded uppercase">
            Demo Portal
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-12 z-10">
        {/* Left Side: Product pitch / Copy */}
        <div className="lg:col-span-7 space-y-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-900 border border-navy-800">
            <Sparkles className="w-3.5 h-3.5 text-gold-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Next-Gen Real Estate SaaS</span>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
              The AI receptionist working{" "}
              <span className="bg-gradient-to-r from-gold-400 via-white to-electric-400 bg-clip-text text-transparent">
                24/7/365
              </span>
            </h2>
            <p className="text-slate-400 text-base md:text-lg max-w-xl leading-relaxed">
              Answer every incoming customer call, explain property details, score lead intent, and book site visits automatically. Direct sync with your real estate CRM.
            </p>
          </div>

          {/* Quick value props list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-navy-900 border border-navy-850 flex items-center justify-center text-electric-400 flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">Zero Missed Leads</h4>
                <p className="text-xs text-slate-500 mt-0.5">Captures 100% of midnight and weekend inquiries.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-navy-900 border border-navy-850 flex items-center justify-center text-gold-500 flex-shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">RAG Knowledge Ingestion</h4>
                <p className="text-xs text-slate-500 mt-0.5">Answers complex pricing and amenity questions via document searches.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-navy-900 border border-navy-850 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">Instant Intent Scoring</h4>
                <p className="text-xs text-slate-500 mt-0.5">Filters hot prospects so agents focus only on hot deals.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-navy-900 border border-navy-850 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">Role-Based Operations</h4>
                <p className="text-xs text-slate-500 mt-0.5">Custom UI filters tailored for Admin, Manager, and Sales roles.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login card with Role Emulator */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="w-full max-w-md p-8 rounded-2xl bg-navy-900/80 border border-navy-800 backdrop-blur-xl shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-electric-500/5 rounded-full blur-2xl -z-10" />

            <div className="space-y-1.5 text-center">
              <h3 className="text-2xl font-bold tracking-tight">Access Portal</h3>
              <p className="text-xs text-slate-400">Select an emulator role to preview different access dashboards.</p>
            </div>

             {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-electric-500"
                  />
                </div>

                <div className="relative">
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-550 text-xs focus:outline-none focus:border-electric-500"
                  />
                  <Lock className="absolute right-3.5 top-8 w-4 h-4 text-slate-600" />
                </div>

                {/* Role Select Simulator */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-gold-500" />
                    <span>Emulator Role (CRM Permissions)</span>
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => handleRoleChange(e.target.value as any)}
                    className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-300 text-xs font-bold focus:outline-none focus:border-electric-500 cursor-pointer"
                  >
                    <option value="Admin">Admin (Full Write/Read + Settings)</option>
                    <option value="Manager">Manager (Edit listings + View leads)</option>
                    <option value="Sales">Sales Agent (View leads, hides Cold leads)</option>
                  </select>
                </div>


              {/* Action buttons */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-electric-500 hover:bg-electric-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-electric-500/20 hover:shadow-electric-500/35 flex items-center justify-center gap-2 group disabled:opacity-75"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                      <span>Entering Portal...</span>
                    </span>
                  ) : (
                    <>
                      <span>Enter CRM Dashboard</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-center pt-4 border-t border-navy-850">
              <span className="text-[10px] text-slate-500 font-bold block">EstateAI Sandbox Dashboard Platform v1.0</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-navy-900/60 z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
          <p>© 2026 EstateAI Systems Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-400">Documentation</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-400">API Endpoint Status</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-400">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
