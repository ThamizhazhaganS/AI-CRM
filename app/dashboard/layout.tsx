"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  PhoneCall,
  BarChart3,
  BookOpen,
  Settings,
  LogOut,
  UserCheck,
  Building,
  Menu,
  X,
  Bell,
  Shield,
  Phone,
  PhoneOff,
  Loader2
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>("Admin");
  const [userName, setUserName] = useState<string>("Admin User");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Floating Sandbox Dialer States
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState("Ready");
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [scriptProcessor, setScriptProcessor] = useState<ScriptProcessorNode | null>(null);

  // u-law / linear conversion logic in UI
  const linear2ulaw = (sample: number) => {
    let sign = (sample < 0) ? 0x80 : 0;
    if (sample < 0) sample = -sample;
    sample += 132;
    if (sample > 32767) sample = 32767;
    let exponent = 7;
    for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; expMask >>= 1) {
      exponent--;
    }
    let mantissa = (sample >> (exponent + 3)) & 0x0f;
    return ~(sign | (exponent << 4) | mantissa);
  };

  const ulaw2linear = (ulaw: number) => {
    ulaw = ~ulaw;
    let sign = (ulaw & 0x80) ? -1 : 1;
    let exponent = (ulaw & 0x70) >> 4;
    let mantissa = ulaw & 0x0f;
    let sample = (mantissa << 3) + 132;
    sample <<= exponent;
    return sign * (sample - 132);
  };

  const startDemoCall = async () => {
    try {
      setCallStatus("Requesting Mic...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      setCallStatus("Connecting to AI...");
      const ws = new WebSocket("ws://localhost:8000/api/voice_agent/stream");
      setWsConnection(ws);

      let nextStartTime = 0;
      let localAudioCtx: AudioContext | null = null;
      let activeSources: AudioBufferSourceNode[] = [];

      ws.onopen = () => {
        setIsCallActive(true);
        setCallStatus("Connected (AI Receptionist)");
        
        ws.send(JSON.stringify({
          event: "start",
          start: {
            streamSid: "browser-call-stream",
            callSid: "browser-call-sid",
            customParameters: {
              From: "+91 98888 77777"
            }
          }
        }));

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        localAudioCtx = new AudioContextClass({ sampleRate: 8000 });
        setAudioCtx(localAudioCtx);

        const source = localAudioCtx.createMediaStreamSource(stream);
        const processor = localAudioCtx.createScriptProcessor(2048, 1, 1);
        setScriptProcessor(processor);

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const ulawBytes = new Uint8Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            let sample = inputData[i] * 32768;
            if (sample > 32767) sample = 32767;
            if (sample < -32768) sample = -32768;
            ulawBytes[i] = linear2ulaw(sample);
          }
          const base64 = btoa(String.fromCharCode.apply(null, Array.from(ulawBytes)));
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              event: "media",
              media: { payload: base64 }
            }));
          }
        };

        source.connect(processor);
        processor.connect(localAudioCtx.destination);
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "clear") {
            // Stop and discard all playing/scheduled audio chunks immediately
            activeSources.forEach((src) => {
              try {
                src.stop();
              } catch (e) {
                // Ignore if already stopped
              }
            });
            activeSources = [];
            if (localAudioCtx) {
              nextStartTime = localAudioCtx.currentTime;
            }
            console.log("[Dialer] Audio playback cleared due to interruption/clear event");
          } else if (data.event === "media" && data.media && data.media.payload) {
            const base64Payload = data.media.payload;
            const binaryString = atob(base64Payload);
            const ulawBytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              ulawBytes[i] = binaryString.charCodeAt(i);
            }

            const float32Samples = new Float32Array(ulawBytes.length);
            for (let i = 0; i < ulawBytes.length; i++) {
              float32Samples[i] = ulaw2linear(ulawBytes[i]) / 32768;
            }

            if (localAudioCtx) {
              const audioBuffer = localAudioCtx.createBuffer(1, float32Samples.length, 8000);
              audioBuffer.copyToChannel(float32Samples, 0);

              const bufferSource = localAudioCtx.createBufferSource();
              bufferSource.buffer = audioBuffer;
              bufferSource.connect(localAudioCtx.destination);

              // Track active source to allow stopping it on interruption
              activeSources.push(bufferSource);
              bufferSource.onended = () => {
                const idx = activeSources.indexOf(bufferSource);
                if (idx > -1) {
                  activeSources.splice(idx, 1);
                }
              };

              const now = localAudioCtx.currentTime;
              if (nextStartTime < now) {
                nextStartTime = now;
              }
              bufferSource.start(nextStartTime);
              nextStartTime += audioBuffer.duration;
            }
          }
        } catch (err) {
          console.error("Error processing audio frame:", err);
        }
      };

      ws.onclose = () => {
        hangUpCall();
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setCallStatus("Error connecting");
      };

    } catch (err: any) {
      console.error("Mic access denied or WebSocket failure:", err);
      setCallStatus("Connection Failed");
      alert("Mic permission is required to speak to the AI Receptionist.");
    }
  };

  const hangUpCall = () => {
    setCallStatus("Ending Call...");
    if (wsConnection) {
      if (wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({ event: "stop" }));
      }
      wsConnection.close();
      setWsConnection(null);
    }
    if (scriptProcessor) {
      scriptProcessor.disconnect();
      setScriptProcessor(null);
    }
    if (audioCtx) {
      if (audioCtx.state !== 'closed') {
        audioCtx.close();
      }
      setAudioCtx(null);
    }
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
    }
    setIsCallActive(false);
    setCallStatus("Ready");
    window.dispatchEvent(new Event("callEnded"));
  };

  useEffect(() => {
    const savedRole = localStorage.getItem("userRole") || "Admin";
    const savedName = localStorage.getItem("userName") || "Admin User";
    setRole(savedRole);
    setUserName(savedName);

    const handleRoleUpdate = () => {
      setRole(localStorage.getItem("userRole") || "Admin");
      setUserName(localStorage.getItem("userName") || "Admin User");
    };
    window.addEventListener("roleChanged", handleRoleUpdate);
    return () => window.removeEventListener("roleChanged", handleRoleUpdate);
  }, []);

  const handleRoleChange = (newRole: string) => {
    localStorage.setItem("userRole", newRole);
    let emulatedName = "Amit Patel";
    if (newRole === "Manager") emulatedName = "Suresh Kumar";
    else if (newRole === "Sales") emulatedName = "Kavitha Raj";
    localStorage.setItem("userName", emulatedName);
    
    setRole(newRole);
    setUserName(emulatedName);
    window.dispatchEvent(new Event("roleChanged"));
  };

  const menuItems = [
    { name: "Overview", path: "/dashboard", icon: LayoutDashboard, roles: ["Admin", "Manager", "Sales"] },
    { name: "Leads", path: "/dashboard/leads", icon: Users, roles: ["Admin", "Manager", "Sales"] },
    { name: "Appointments", path: "/dashboard/appointments", icon: Calendar, roles: ["Admin", "Manager", "Sales"] },
    { name: "Call Logs", path: "/dashboard/calls", icon: PhoneCall, roles: ["Admin", "Manager", "Sales"] },
    { name: "Analytics", path: "/dashboard/analytics", icon: BarChart3, roles: ["Admin", "Manager"] },
    { name: "Knowledge Base", path: "/dashboard/knowledge", icon: BookOpen, roles: ["Admin", "Manager", "Sales"] },
    { name: "Settings", path: "/dashboard/settings", icon: Settings, roles: ["Admin"] },
  ];

  const currentItem = menuItems.find(
    (item) => pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path))
  );
  const isAllowed = !currentItem || currentItem.roles.includes(role);

  return (
    <div className="flex h-screen overflow-hidden bg-navy-950">
      {/* Sidebar for Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-navy-900 border-r border-navy-800 transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-20"
        } lg:static lg:block ${isSidebarOpen ? "block" : "hidden"}`}
      >
        {/* Branding header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-navy-800">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Building className="w-8 h-8 text-gold-500 text-glow-gold" />
            {isSidebarOpen && (
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-gold-400 bg-clip-text text-transparent">
                Estate<span className="text-electric-500">AI</span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 rounded lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems
            .filter((item) => item.roles.includes(role))
            .map((item) => {
              const isActive = pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                    isActive
                      ? "bg-gradient-to-r from-electric-600 to-electric-700 text-white shadow-lg shadow-electric-600/15"
                      : "text-slate-400 hover:text-white hover:bg-navy-800/50"
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400 group-hover:text-gold-400"}`} />
                  {isSidebarOpen && <span className="font-medium text-sm">{item.name}</span>}
                  {isActive && !isSidebarOpen && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-gold-500 rounded-l-md" />
                  )}
                </Link>
              );
            })}
        </nav>

        {/* Role Switcher & Profile Footer */}
        <div className="p-4 border-t border-navy-800 space-y-4">
          {isSidebarOpen && (
            <div className="p-3 bg-navy-950/50 rounded-xl border border-navy-800/80">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-400">
                <UserCheck className="w-3.5 h-3.5 text-gold-500" />
                <span>ROLE EMULATOR</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
                {["Admin", "Manager", "Sales"].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className={`py-1 rounded-md transition-all ${
                      role === r
                        ? "bg-gold-500 text-navy-950"
                        : "bg-navy-800 text-slate-400 hover:bg-navy-700"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 font-bold rounded-xl bg-gradient-to-tr from-gold-500 to-electric-500 text-navy-950">
              {role[0]}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{userName}</p>
                <p className="text-xs text-slate-400 truncate">{role} Mode</p>
              </div>
            )}
            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("userRole");
                localStorage.removeItem("userName");
                localStorage.removeItem("userEmail");
                router.push("/");
              }}
              title="Logout"
              className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-navy-800 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between h-20 px-6 bg-navy-900 border-b border-navy-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-navy-800 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              {pathname === "/dashboard"
                ? "Overview Dashboard"
                : menuItems.find((item) => pathname.startsWith(item.path) && item.path !== "/dashboard")?.name ||
                  "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>AI Receptionist Live</span>
            </div>

            {/* Notification Bell */}
            <button className="relative p-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-400 hover:text-white transition-colors border border-navy-800">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-gold-500 rounded-full ring-2 ring-navy-900" />
            </button>

            {/* User Profile */}
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-navy-800">
              <span className="text-sm font-medium text-slate-300">ABC Builders</span>
            </div>
          </div>
        </header>

        {/* Dashboard Main Scrollable Panel */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {isAllowed ? (
              children
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-12 bg-navy-900 border border-navy-800 rounded-2xl min-h-[400px] animate-in fade-in zoom-in-95 duration-300">
                <Shield className="w-16 h-16 text-red-500 mb-4 text-glow-red" />
                <h2 className="text-2xl font-bold text-slate-100 mb-2">Access Denied</h2>
                <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-6">
                  Your current emulation role (<strong className="text-gold-500">{role}</strong>) does not possess permission levels to access the <strong className="text-white">{currentItem?.name}</strong> section.
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-5 py-2.5 bg-electric-500 hover:bg-electric-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-electric-500/20 animate-pulse"
                >
                  Return to Overview
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Call Sandbox Dialer Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {isDialerOpen && (
          <div className="w-80 bg-navy-900 border border-navy-800 rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 space-y-4">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isCallActive ? "bg-emerald-500 animate-pulse" : "bg-slate-500"}`} />
                <span className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">Live AI Sandbox Dialer</span>
              </div>
              <button 
                onClick={() => setIsDialerOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-center py-4 space-y-2">
              <p className="text-xs text-slate-400">Emulating call from: <strong className="text-slate-200">+91 98888 77777</strong></p>
              <div className="flex justify-center items-center gap-2">
                {isCallActive ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold animate-pulse">
                    <Phone className="w-4 h-4 animate-bounce" />
                    <span>{callStatus}</span>
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-slate-300">Ready to test connection</div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {!isCallActive ? (
                <button
                  onClick={startDemoCall}
                  className="w-full py-3 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-navy-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/10 hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4 fill-current" />
                  <span>Call AI Receptionist</span>
                </button>
              ) : (
                <button
                  onClick={hangUpCall}
                  className="w-full py-3 bg-gradient-to-tr from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-red-500/10 hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <PhoneOff className="w-4 h-4 fill-current" />
                  <span>Hang Up</span>
                </button>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => setIsDialerOpen(!isDialerOpen)}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-extrabold text-xs tracking-wider uppercase transition-all shadow-xl hover:scale-105 border ${
            isCallActive 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse" 
              : "bg-navy-900 border-navy-800 text-slate-300 hover:border-electric-500/50"
          }`}
        >
          <PhoneCall className={`w-4 h-4 ${isCallActive ? "animate-spin" : ""}`} />
          <span>{isCallActive ? "Active Demo Call..." : "Live AI Demo Dialer"}</span>
        </button>
      </div>
    </div>
  );
}
