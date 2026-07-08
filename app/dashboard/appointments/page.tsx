"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/app/lib/api";
import {
  Calendar,
  Clock,
  Phone,
  Check,
  X,
  Plus,
  Building2,
  RefreshCw,
  Loader2,
  CheckCircle,
} from "lucide-react";

interface Appointment {
  id: string;
  lead_id: string | null;
  lead_name: string;
  lead_phone: string;
  property_name: string;
  type: string;
  status: string;
  slot_datetime: string;
  notes: string | null;
}

function formatSlot(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString([], {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/** Return day-of-month numbers that have at least one appointment */
function getDaysWithEvents(appointments: Appointment[]): Set<number> {
  const days = new Set<number>();
  appointments.forEach((apt) => {
    const d = new Date(apt.slot_datetime);
    // Only mark days in the current month
    const now = new Date();
    if (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    ) {
      days.add(d.getDate());
    }
  });
  return days;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [role, setRole] = useState("Admin");
  const [filterType, setFilterType] = useState("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [showBookModal, setShowBookModal] = useState(false);
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [propertiesList, setPropertiesList] = useState<any[]>([]);
  const [bookingForm, setBookingForm] = useState({
    lead_id: "",
    property_id: "",
    type: "Site Visit",
    slot_datetime: "",
    notes: "",
  });
  const [booking, setBooking] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);

  const openBookModal = async () => {
    setShowBookModal(true);
    try {
      const leads = await api.getLeads();
      setLeadsList(leads);
      
      const properties = await api.getProperties();
      setPropertiesList(properties);

      setBookingForm({
        lead_id: leads[0]?.id || "",
        property_id: properties[0]?.id || "",
        type: "Site Visit",
        slot_datetime: "",
        notes: "",
      });
    } catch (err) {
      console.error("Failed to load modal data:", err);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.lead_id || !bookingForm.slot_datetime) {
      alert("Lead and Date/Time are required.");
      return;
    }
    setBooking(true);
    try {
      await api.createAppointment({
        lead_id: bookingForm.lead_id,
        property_id: bookingForm.property_id || null,
        type: bookingForm.type,
        slot_datetime: new Date(bookingForm.slot_datetime).toISOString(),
        notes: bookingForm.notes || null,
        status: "Approved", // Approved immediately by Admin/Manager
      });
      setBookSuccess(true);
      setShowBookModal(false);
      fetchAppointments();
      setTimeout(() => setBookSuccess(false), 4000);
    } catch (err: any) {
      alert("Failed to book appointment: " + err.message);
    } finally {
      setBooking(false);
    }
  };

  // ── fetch from backend ──────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await api.getAppointments();
      setAppointments(data);
    } catch (err: any) {
      console.error("Failed to load appointments:", err);
      setErrorMsg("Could not load appointments. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setRole(localStorage.getItem("userRole") || "Admin");
    fetchAppointments();

    const handleRoleUpdate = () => {
      setRole(localStorage.getItem("userRole") || "Admin");
    };
    window.addEventListener("roleChanged", handleRoleUpdate);
    return () => window.removeEventListener("roleChanged", handleRoleUpdate);
  }, [fetchAppointments]);

  // ── approve / cancel ────────────────────────────────────────────────
  const handleStatusChange = async (
    id: string,
    newStatus: "Approved" | "Cancelled"
  ) => {
    setActionLoading(id);
    try {
      const updated = await api.updateAppointment(id, { status: newStatus });
      setAppointments((prev) =>
        prev.map((apt) => (apt.id === id ? { ...apt, ...updated } : apt))
      );
    } catch (err: any) {
      console.error("Failed to update appointment:", err);
      alert(`Error: ${err.message || "Could not update appointment."}`);
    } finally {
      setActionLoading(null);
    }
  };

  // ── filtering ───────────────────────────────────────────────────────
  const filteredApts = appointments.filter((apt) => {
    // 1. Tab filtering
    let matchTab = true;
    if (filterType === "All") matchTab = true;
    else if (filterType === "Pending") matchTab = (apt.status === "Pending");
    else matchTab = (apt.type === filterType);

    // 2. Date filtering
    let matchDate = true;
    if (selectedDay !== null) {
      try {
        const d = new Date(apt.slot_datetime);
        const now = new Date();
        matchDate = (
          d.getDate() === selectedDay &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      } catch {
        matchDate = false;
      }
    }

    return matchTab && matchDate;
  });

  const pendingCount = appointments.filter((a) => a.status === "Pending").length;

  // ── calendar helpers ────────────────────────────────────────────────
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const eventDays = getDaysWithEvents(appointments);

  // ── status badge ────────────────────────────────────────────────────
  const statusBadge = (status: string) => {
    if (status === "Approved")
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    if (status === "Cancelled")
      return "bg-red-500/10 text-red-400 border border-red-500/20";
    if (status === "Completed")
      return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    // Pending
    return "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Book Appointment Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={() => setShowBookModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-navy-900 border border-navy-800 rounded-2xl shadow-2xl shadow-black/40 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-navy-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-electric-500" />
                <h3 className="font-bold text-base">Book Appointment</h3>
              </div>
              <button onClick={() => setShowBookModal(false)} className="text-slate-400 hover:text-white"><Plus className="w-5 h-5 rotate-45" /></button>
            </div>
            <form onSubmit={handleBookAppointment} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Select Lead</label>
                <select
                  value={bookingForm.lead_id}
                  onChange={e => setBookingForm({...bookingForm, lead_id: e.target.value})}
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-electric-500"
                >
                  {leadsList.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Select Property (Optional)</label>
                <select
                  value={bookingForm.property_id}
                  onChange={e => setBookingForm({...bookingForm, property_id: e.target.value})}
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-electric-500"
                >
                  <option value="">General / No Property</option>
                  {propertiesList.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Appointment Type</label>
                <select
                  value={bookingForm.type}
                  onChange={e => setBookingForm({...bookingForm, type: e.target.value})}
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-electric-500"
                >
                  <option>Site Visit</option>
                  <option>Callback</option>
                  <option>Video Call</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={bookingForm.slot_datetime}
                  onChange={e => setBookingForm({...bookingForm, slot_datetime: e.target.value})}
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-electric-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Client prefers weekend visit"
                  value={bookingForm.notes}
                  onChange={e => setBookingForm({...bookingForm, notes: e.target.value})}
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-electric-500"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowBookModal(false)} className="flex-1 py-2.5 border border-navy-700 rounded-xl text-xs font-bold text-slate-400 hover:bg-navy-800">Cancel</button>
                <button type="submit" disabled={booking} className="flex-1 py-2.5 bg-electric-500 hover:bg-electric-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                  {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  {booking ? "Booking..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {bookSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4" />
          Appointment booked successfully!
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Visits &amp; Callbacks</h2>
          <p className="text-xs text-slate-400">
            Manage site visit slot schedules and follow-up callbacks booked by the AI Receptionist
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAppointments}
            disabled={loading}
            className="p-2 rounded-xl bg-navy-900 border border-navy-800 hover:border-electric-500/50 text-slate-400 hover:text-electric-400 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {(role === "Admin" || role === "Manager") && (
            <button
              onClick={openBookModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-electric-600 hover:bg-electric-700 rounded-xl text-xs font-semibold text-white shadow shadow-electric-600/10 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Manually Book Visit</span>
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Grid: Calendar left, list right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mini Calendar */}
        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-4">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gold-500" />
            <span>
              {today.toLocaleString("default", { month: "long" })} {today.getFullYear()}
            </span>
          </h3>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-slate-400 pt-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
            {/* Leading empty cells */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate();
              const isSelected = selectedDay === day;
              const hasEvents = eventDays.has(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(prev => prev === day ? null : day)}
                  className={`py-2 rounded-lg flex flex-col items-center justify-center relative cursor-pointer hover:bg-navy-800 transition-all ${
                    isToday
                      ? "bg-electric-500 text-white font-extrabold shadow-md shadow-electric-500/15"
                      : isSelected
                      ? "bg-electric-500/20 text-electric-400 font-extrabold border border-electric-500/30"
                      : "text-slate-300"
                  }`}
                >
                  <span>{day}</span>
                  {hasEvents && !isToday && (
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? "bg-electric-400" : "bg-gold-500"}`} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-navy-850 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-electric-500" />
              <span>Today ({today.getDate()}{["th","st","nd","rd"][(today.getDate() % 10 > 3 || Math.floor(today.getDate() / 10) === 1) ? 0 : today.getDate() % 10]} {today.toLocaleString("default", { month: "short" })})</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-gold-500" />
              <span>Scheduled visits / callback days</span>
            </div>
          </div>
        </div>

        {/* Appointments list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter tabs */}
          <div className="flex border-b border-navy-800 text-xs font-bold bg-navy-900 border border-navy-800 rounded-xl p-1 gap-1">
            {["All", "Site Visit", "Callback", "Video Call", "Pending"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`flex-1 py-2 px-3 rounded-lg transition-all ${
                  filterType === t
                    ? "bg-navy-950 text-white border border-navy-850"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t} {t === "Pending" && `(${pendingCount})`}
              </button>
            ))}
          </div>

          {/* Active Date Filter Alert */}
          {selectedDay !== null && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-navy-900 border border-navy-850 text-xs text-slate-300 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-electric-500 animate-ping" />
                <span>Showing visits/callbacks scheduled for <b>{selectedDay} {today.toLocaleString("default", { month: "long" })} {today.getFullYear()}</b></span>
              </div>
              <button 
                onClick={() => setSelectedDay(null)}
                className="text-electric-400 hover:text-electric-300 font-bold transition-all px-2.5 py-1 rounded-lg bg-electric-500/10 hover:bg-electric-500/15 border border-electric-500/10"
              >
                Clear Date Filter
              </button>
            </div>
          )}

          {/* Cards */}
          <div className="space-y-4">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <span className="w-6 h-6 border-2 border-t-transparent border-electric-500 rounded-full animate-spin" />
                <p className="text-xs text-slate-500 font-bold">Loading appointments from database...</p>
              </div>
            ) : filteredApts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic bg-navy-900 border border-navy-800 rounded-2xl">
                {appointments.length === 0
                  ? "No appointments have been booked yet."
                  : "No appointments in this category."}
              </div>
            ) : (
              filteredApts.map((apt) => (
                <div
                  key={apt.id}
                  className="p-5 rounded-2xl bg-navy-900 border border-navy-800 flex flex-col md:flex-row justify-between gap-4 hover:border-navy-700/80 transition-all duration-200"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          apt.type === "Site Visit"
                            ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-400 border border-emerald-500/20"
                            : apt.type === "Video Call"
                            ? "bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-purple-400 border border-purple-500/20"
                            : "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {apt.type}
                      </span>
                      <span className="text-xs text-slate-400">ID: {apt.id}</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-lg text-slate-100">{apt.lead_name}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{apt.lead_phone || "—"}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-gold-500" />
                        <span>{apt.property_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-electric-500" />
                        <span>{formatSlot(apt.slot_datetime)}</span>
                      </div>
                    </div>

                    {apt.notes && (
                      <p className="text-xs text-slate-500 italic">
                        Note: {apt.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col items-center justify-between md:justify-center md:items-end gap-3 md:pl-6 md:border-l border-navy-850">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">Status</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusBadge(apt.status)}`}>
                        {apt.status}
                      </span>
                    </div>

                    {(role === "Admin" || role === "Manager") && apt.status === "Pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(apt.id, "Approved")}
                          disabled={actionLoading === apt.id}
                          className="p-2 bg-emerald-500 hover:bg-emerald-600 text-navy-950 hover:scale-105 rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1 text-xs font-bold disabled:opacity-60"
                          title="Approve"
                        >
                          {actionLoading === apt.id ? (
                            <span className="w-4 h-4 border-2 border-t-transparent border-navy-900 rounded-full animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span className="pr-1">Approve</span>
                        </button>
                        <button
                          onClick={() => handleStatusChange(apt.id, "Cancelled")}
                          disabled={actionLoading === apt.id}
                          className="p-2 bg-navy-850 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-all border border-navy-700 disabled:opacity-60"
                          title="Reject / Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : apt.status === "Approved" && (role === "Admin" || role === "Manager") ? (
                      <button
                        onClick={() => handleStatusChange(apt.id, "Cancelled")}
                        disabled={actionLoading === apt.id}
                        className="px-3 py-1.5 bg-navy-850 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg text-xs font-semibold border border-navy-750 transition-all disabled:opacity-60"
                      >
                        Cancel Booking
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
