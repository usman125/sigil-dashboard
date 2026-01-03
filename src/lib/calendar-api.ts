// Calendar and Events API client

import { getAuthToken } from "./api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// Types
export interface EncryptedField {
  ciphertext: string;
  iv: string;
  encryptedKey: string;
}

export interface Reminder {
  type: "notification" | "email";
  minutesBefore: number;
  sent?: boolean;
}

export interface Calendar {
  _id: string;
  user: string;
  name: EncryptedField;
  color: string;
  isDefault: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  _id: string;
  user: string;
  calendar: {
    _id: string;
    color: string;
    name: EncryptedField;
  } | string;
  title: EncryptedField;
  description?: EncryptedField | null;
  location?: EncryptedField | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  timezone: string;
  recurrence?: string | null;
  sourceType: "manual" | "email";
  sourceEmail?: string | null;
  reminders: Reminder[];
  status: "confirmed" | "tentative" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface DecryptedCalendar {
  _id: string;
  user: string;
  name: string;
  color: string;
  isDefault: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DecryptedEvent {
  _id: string;
  calendarId: string;
  calendarColor: string;
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  timezone: string;
  reminders: Reminder[];
  status: "confirmed" | "tentative" | "cancelled";
  sourceType: "manual" | "email";
}

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || "API request failed");
  }

  return data;
}

// Calendar API
export const calendarApi = {
  // Get all calendars for user
  getCalendars: async (): Promise<{ success: boolean; count: number; data: Calendar[] }> => {
    return apiRequest("/calendars");
  },

  // Get single calendar
  getCalendar: async (id: string): Promise<{ success: boolean; data: Calendar }> => {
    return apiRequest(`/calendars/${id}`);
  },

  // Get or get default calendar
  getDefaultCalendar: async (): Promise<{ success: boolean; data: Calendar | null }> => {
    return apiRequest("/calendars/default");
  },

  // Create calendar
  createCalendar: async (
    name: EncryptedField,
    color?: string,
    isDefault?: boolean
  ): Promise<{ success: boolean; data: Calendar }> => {
    return apiRequest("/calendars", {
      method: "POST",
      body: JSON.stringify({ name, color, isDefault }),
    });
  },

  // Update calendar
  updateCalendar: async (
    id: string,
    data: {
      name?: EncryptedField;
      color?: string;
      isDefault?: boolean;
      isVisible?: boolean;
    }
  ): Promise<{ success: boolean; data: Calendar }> => {
    return apiRequest(`/calendars/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Delete calendar
  deleteCalendar: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest(`/calendars/${id}`, {
      method: "DELETE",
    });
  },
};

// Events API
export const eventsApi = {
  // Get events with optional filters
  getEvents: async (params?: {
    start?: string;
    end?: string;
    calendarId?: string;
  }): Promise<{ success: boolean; count: number; data: CalendarEvent[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.start) queryParams.set("start", params.start);
    if (params?.end) queryParams.set("end", params.end);
    if (params?.calendarId) queryParams.set("calendarId", params.calendarId);
    
    const queryString = queryParams.toString();
    return apiRequest(`/events${queryString ? `?${queryString}` : ""}`);
  },

  // Get single event
  getEvent: async (id: string): Promise<{ success: boolean; data: CalendarEvent }> => {
    return apiRequest(`/events/${id}`);
  },

  // Get upcoming events (next 7 days)
  getUpcomingEvents: async (): Promise<{ success: boolean; count: number; data: CalendarEvent[] }> => {
    return apiRequest("/events/upcoming");
  },

  // Get events for a specific day
  getDayEvents: async (date: string): Promise<{ success: boolean; count: number; data: CalendarEvent[] }> => {
    return apiRequest(`/events/day/${date}`);
  },

  // Create event
  createEvent: async (eventData: {
    calendarId?: string;
    title: EncryptedField;
    description?: EncryptedField | null;
    location?: EncryptedField | null;
    startTime: string;
    endTime: string;
    isAllDay?: boolean;
    timezone?: string;
    reminders?: Reminder[];
  }): Promise<{ success: boolean; data: CalendarEvent }> => {
    return apiRequest("/events", {
      method: "POST",
      body: JSON.stringify(eventData),
    });
  },

  // Update event
  updateEvent: async (
    id: string,
    eventData: {
      calendarId?: string;
      title?: EncryptedField;
      description?: EncryptedField | null;
      location?: EncryptedField | null;
      startTime?: string;
      endTime?: string;
      isAllDay?: boolean;
      timezone?: string;
      reminders?: Reminder[];
      status?: "confirmed" | "tentative" | "cancelled";
    }
  ): Promise<{ success: boolean; data: CalendarEvent }> => {
    return apiRequest(`/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(eventData),
    });
  },

  // Delete event
  deleteEvent: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest(`/events/${id}`, {
      method: "DELETE",
    });
  },
};


