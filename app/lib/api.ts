const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

// ── Auth helpers ────────────────────────────────────────────────────────────

function getHeaders(isMultipart = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

/** Clear session and redirect to login on 401. */
function handleUnauthorized() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    window.location.href = "/";
  }
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, options);

  // Auto-logout on expired / invalid token
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ── API surface ──────────────────────────────────────────────────────────────

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!response.ok) {
      let errorMessage = "Incorrect email or password.";
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch { }
      throw new Error(errorMessage);
    }

    return response.json(); // { access_token, token_type, user }
  },

  async getMe() {
    return apiRequest<any>("/api/auth/me", { headers: getHeaders() });
  },

  // ── Leads ──────────────────────────────────────────────────────────────────
  async getLeads(params?: { category?: string; status?: string; search?: string }) {
    let query = "";
    if (params) {
      const sp = new URLSearchParams();
      if (params.category && params.category !== "All") sp.append("category", params.category);
      if (params.status && params.status !== "All") sp.append("status", params.status);
      if (params.search) sp.append("search", params.search);
      query = `?${sp.toString()}`;
    }
    return apiRequest<any[]>(`/api/leads${query}`, { headers: getHeaders() });
  },

  async getLead(id: string) {
    return apiRequest<any>(`/api/leads/${id}`, { headers: getHeaders() });
  },

  async createLead(leadData: any) {
    return apiRequest<any>("/api/leads", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(leadData),
    });
  },

  async updateLead(id: string, updateData: any) {
    return apiRequest<any>(`/api/leads/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updateData),
    });
  },

  async deleteLead(id: string) {
    return apiRequest<void>(`/api/leads/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  // ── Calls ──────────────────────────────────────────────────────────────────
  async getCalls(leadId?: string) {
    const query = leadId ? `?lead_id=${leadId}` : "";
    return apiRequest<any[]>(`/api/calls${query}`, { headers: getHeaders() });
  },

  async getCallDetails(id: string) {
    return apiRequest<any>(`/api/calls/${id}`, { headers: getHeaders() });
  },

  async getCallAnalytics(timeframe?: string) {
    let query = "";
    if (timeframe) {
      let days = 30;
      if (timeframe === "7d") days = 7;
      if (timeframe === "6m") days = 180;
      query = `?days=${days}`;
    }
    return apiRequest<any>(`/api/calls/analytics/summary${query}`, { headers: getHeaders() });
  },

  // ── Appointments ───────────────────────────────────────────────────────────
  async getAppointments() {
    return apiRequest<any[]>("/api/appointments", { headers: getHeaders() });
  },

  async updateAppointment(id: string, updateData: any) {
    return apiRequest<any>(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updateData),
    });
  },

  async deleteAppointment(id: string) {
    return apiRequest<void>(`/api/appointments/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  async createAppointment(aptData: any) {
    return apiRequest<any>("/api/appointments", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(aptData),
    });
  },


  // ── Properties ─────────────────────────────────────────────────────────────
  async getProperties() {
    return apiRequest<any[]>("/api/properties", { headers: getHeaders() });
  },

  async createProperty(propertyData: any) {
    return apiRequest<any>("/api/properties", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(propertyData),
    });
  },

  async deleteProperty(id: string) {
    return apiRequest<void>(`/api/properties/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  async getSettings() {
    return apiRequest<any>("/api/settings", { headers: getHeaders() });
  },

  async updateSettings(settingsData: any) {
    return apiRequest<any>("/api/settings", {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(settingsData),
    });
  },

  // ── Analytics Overview ─────────────────────────────────────────────────────
  async getAnalyticsOverview(timeframe?: string) {
    let query = "";
    if (timeframe) {
      let days = 30;
      if (timeframe === "7d") days = 7;
      if (timeframe === "6m") days = 180;
      query = `?days=${days}`;
    }
    return apiRequest<any>(`/api/settings/analytics/overview${query}`, {
      headers: getHeaders(),
    });
  },
};
