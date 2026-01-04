"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Plus,
  Loader2,
  ChevronDown,
  Eye,
  EyeOff,
  Trash2,
  Settings,
  Menu,
  X,
} from "lucide-react";
import {
  calendarApi,
  eventsApi,
  Calendar as CalendarType,
  CalendarEvent,
  DecryptedCalendar,
  DecryptedEvent,
} from "@/lib/calendar-api";
import {
  decryptCalendars,
  decryptEvents,
  encryptField,
} from "@/lib/event-crypto";
import { getPrivateKeyForDecryption, getPublicKey } from "@/lib/auth";
import CalendarView from "@/components/calendar/CalendarView";
import EventModal from "@/components/calendar/EventModal";
import { cn } from "@/lib/utils";

type ViewMode = "month" | "week" | "day";

export default function CalendarPage() {
  const [calendars, setCalendars] = useState<DecryptedCalendar[]>([]);
  const [events, setEvents] = useState<DecryptedEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [isLoading, setIsLoading] = useState(true);
  const [showCalendarList, setShowCalendarList] = useState(true);

  // Modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DecryptedEvent | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Calendar creation state
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState("");
  const [newCalendarColor, setNewCalendarColor] = useState("#3b82f6");
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Get date range for fetching events based on view
  const getDateRange = useCallback(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === "month") {
      start.setDate(1);
      start.setDate(start.getDate() - start.getDay()); // Start of week containing first day
      end.setMonth(end.getMonth() + 1, 0);
      end.setDate(end.getDate() + (6 - end.getDay())); // End of week containing last day
    } else if (viewMode === "week") {
      start.setDate(start.getDate() - start.getDay());
      end.setDate(start.getDate() + 6);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [currentDate, viewMode]);

  // Load calendars
  const loadCalendars = useCallback(async () => {
    try {
      const privateKey = await getPrivateKeyForDecryption();
      if (!privateKey) {
        console.error("No private key available");
        return;
      }

      const response = await calendarApi.getCalendars();
      const decrypted = await decryptCalendars(response.data, privateKey);
      setCalendars(decrypted);
    } catch (error) {
      console.error("Failed to load calendars:", error);
    }
  }, []);

  // Load events for current date range
  const loadEvents = useCallback(async () => {
    try {
      const privateKey = await getPrivateKeyForDecryption();
      if (!privateKey) {
        console.error("No private key available");
        return;
      }

      const { start, end } = getDateRange();
      const response = await eventsApi.getEvents({
        start: start.toISOString(),
        end: end.toISOString(),
      });
      const decrypted = await decryptEvents(response.data, privateKey);
      setEvents(decrypted);
    } catch (error) {
      console.error("Failed to load events:", error);
    }
  }, [getDateRange]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([loadCalendars(), loadEvents()]);
      setIsLoading(false);
    };
    load();
  }, [loadCalendars, loadEvents]);

  // Reload events when date range changes
  useEffect(() => {
    if (!isLoading) {
      loadEvents();
    }
  }, [currentDate, viewMode]);

  // Create default calendar if none exists
  const createDefaultCalendar = async () => {
    try {
      const privateKey = await getPrivateKeyForDecryption();
      if (!privateKey) return;

      // Get public key for encryption (we need to fetch it or store it)
      const response = await fetch("/api/auth/me");
      // For now, we'll handle this in the modal
    } catch (error) {
      console.error("Failed to create calendar:", error);
    }
  };

  // Event handlers
  const handleEventClick = (event: DecryptedEvent) => {
    setSelectedEvent(event);
    setSelectedDate(null);
    setIsEventModalOpen(true);
  };

  const handleCreateEvent = (date: Date) => {
    setSelectedEvent(null);
    setSelectedDate(date);
    setIsEventModalOpen(true);
  };

  const handleModalClose = () => {
    setIsEventModalOpen(false);
    setSelectedEvent(null);
    setSelectedDate(null);
  };

  const handleEventSaved = () => {
    handleModalClose();
    loadEvents();
  };

  const handleEventDeleted = () => {
    handleModalClose();
    loadEvents();
  };

  // Create new calendar
  const handleCreateCalendar = async () => {
    if (!newCalendarName.trim()) {
      setCalendarError("Calendar name is required");
      return;
    }

    try {
      setCalendarError(null);
      const publicKey = getPublicKey();
      if (!publicKey) {
        setCalendarError("Unable to get encryption key. Please re-login.");
        return;
      }

      const encryptedName = await encryptField(newCalendarName, publicKey);
      await calendarApi.createCalendar(
        encryptedName,
        newCalendarColor,
        calendars.length === 0
      );

      // Reload calendars
      await loadCalendars();
      
      // Reset form
      setIsCreatingCalendar(false);
      setNewCalendarName("");
      setNewCalendarColor("#3b82f6");
    } catch (error) {
      console.error("Failed to create calendar:", error);
      setCalendarError("Failed to create calendar");
    }
  };

  // Toggle calendar visibility
  const toggleCalendarVisibility = async (calendar: DecryptedCalendar) => {
    try {
      await calendarApi.updateCalendar(calendar._id, {
        isVisible: !calendar.isVisible,
      });
      setCalendars((prev) =>
        prev.map((c) =>
          c._id === calendar._id ? { ...c, isVisible: !c.isVisible } : c
        )
      );
    } catch (error) {
      console.error("Failed to toggle calendar visibility:", error);
    }
  };

  // Filter events by visible calendars
  const visibleEvents = events.filter((event) => {
    const calendar = calendars.find((c) => c._id === event.calendarId);
    return calendar?.isVisible !== false;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] md:h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Calendar</h1>
          <p className="text-sm md:text-base text-[var(--muted-foreground)]">
            Manage your events and schedule
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setShowCalendarList(!showCalendarList)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 bg-[var(--muted)] rounded-lg hover:bg-[var(--border)] transition-colors"
          >
            <Menu className="w-4 h-4" />
            <span className="text-sm">Calendars</span>
          </button>
          <button
            onClick={() => handleCreateEvent(new Date())}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm md:text-base"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Event</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 min-h-0 relative">
        {/* Sidebar - Calendar List */}
        {/* Mobile: Overlay, Desktop: Sidebar */}
        {showCalendarList && (
          <>
            {/* Mobile overlay backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setShowCalendarList(false)}
            />
            <div className={cn(
              "lg:w-64 flex-shrink-0 z-50",
              // Mobile: Fixed overlay
              "fixed inset-y-0 left-0 w-72 lg:relative lg:inset-auto"
            )}>
              <div className="bg-[var(--card)] rounded-none lg:rounded-2xl border-r lg:border border-[var(--border)] p-4 h-full overflow-y-auto">
                {/* Mobile close button */}
                <div className="flex items-center justify-between mb-4 lg:hidden">
                  <h3 className="font-semibold">Calendars</h3>
                  <button
                    onClick={() => setShowCalendarList(false)}
                    className="p-2 hover:bg-[var(--muted)] rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              <div className="flex items-center justify-between mb-4 relative lg:block">
                <h3 className="font-semibold hidden lg:block">My Calendars</h3>
                <button
                  onClick={() => setIsCreatingCalendar(!isCreatingCalendar)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isCreatingCalendar 
                      ? "bg-[var(--primary)] text-white" 
                      : "hover:bg-[var(--muted)]"
                  )}
                  title="Add calendar"
                >
                  <Plus className={cn("w-4 h-4 transition-transform", isCreatingCalendar && "rotate-45")} />
                </button>

                {/* Dropdown Calendar Form */}
                {isCreatingCalendar && (
                  <>
                    {/* Backdrop to close on click outside */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => {
                        setIsCreatingCalendar(false);
                        setNewCalendarName("");
                        setCalendarError(null);
                      }}
                    />
                    <div className="absolute top-full right-0 mt-2 w-64 p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-20 space-y-3">
                      <h4 className="font-medium text-sm">New Calendar</h4>
                      {calendarError && (
                        <p className="text-xs text-[var(--destructive)]">{calendarError}</p>
                      )}
                      <input
                        type="text"
                        value={newCalendarName}
                        onChange={(e) => setNewCalendarName(e.target.value)}
                        placeholder="Calendar name"
                        className="w-full px-3 py-2 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:border-[var(--primary)] outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateCalendar();
                          if (e.key === "Escape") {
                            setIsCreatingCalendar(false);
                            setNewCalendarName("");
                            setCalendarError(null);
                          }
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--muted-foreground)]">Color:</span>
                        <div className="flex gap-1.5">
                          {["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"].map((color) => (
                            <button
                              key={color}
                              onClick={() => setNewCalendarColor(color)}
                              className={cn(
                                "w-6 h-6 rounded-full transition-all",
                                newCalendarColor === color 
                                  ? "ring-2 ring-offset-2 ring-offset-[var(--card)] ring-[var(--primary)] scale-110" 
                                  : "hover:scale-110"
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleCreateCalendar}
                          disabled={!newCalendarName.trim()}
                          className="flex-1 px-3 py-2 text-sm font-medium bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => {
                            setIsCreatingCalendar(false);
                            setNewCalendarName("");
                            setCalendarError(null);
                          }}
                          className="px-3 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {calendars.length === 0 && !isCreatingCalendar ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-[var(--muted-foreground)] opacity-50" />
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">
                    No calendars yet
                  </p>
                  <button
                    onClick={() => setIsCreatingCalendar(true)}
                    className="text-sm text-[var(--primary)] hover:underline"
                  >
                    Create your first calendar
                  </button>
                </div>
              ) : calendars.length > 0 ? (
                <div className="space-y-2">
                  {calendars.map((calendar) => (
                    <div
                      key={calendar._id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--muted)] transition-colors group"
                    >
                      <button
                        onClick={() => toggleCalendarVisibility(calendar)}
                        className="flex-shrink-0"
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded border-2 transition-colors",
                            calendar.isVisible !== false
                              ? "bg-current"
                              : "bg-transparent"
                          )}
                          style={{
                            borderColor: calendar.color,
                            backgroundColor:
                              calendar.isVisible !== false
                                ? calendar.color
                                : "transparent",
                          }}
                        />
                      </button>
                      <span className="flex-1 text-sm truncate">
                        {calendar.name}
                      </span>
                      {calendar.isDefault && (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          Default
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Upcoming Events */}
              <div className="mt-6 pt-4 border-t border-[var(--border)]">
                <h4 className="text-sm font-medium mb-3">Upcoming</h4>
                <div className="space-y-2">
                  {visibleEvents
                    .filter(
                      (e) =>
                        new Date(e.startTime) >= new Date() &&
                        e.status !== "cancelled"
                    )
                    .slice(0, 5)
                    .map((event) => (
                      <div
                        key={event._id}
                        onClick={() => {
                          handleEventClick(event);
                          // Close sidebar on mobile after selecting
                          if (window.innerWidth < 1024) {
                            setShowCalendarList(false);
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-[var(--muted)] cursor-pointer transition-colors"
                      >
                        <div
                          className="text-sm font-medium truncate"
                          style={{ color: event.calendarColor }}
                        >
                          {event.title}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {event.startTime.toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                          {!event.isAllDay && (
                            <>
                              {" at "}
                              {event.startTime.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  {visibleEvents.filter(
                    (e) =>
                      new Date(e.startTime) >= new Date() &&
                      e.status !== "cancelled"
                  ).length === 0 && (
                    <p className="text-xs text-[var(--muted-foreground)] text-center py-2">
                      No upcoming events
                    </p>
                  )}
                </div>
              </div>
              </div>
            </div>
          </>
        )}

        {/* Main Calendar View */}
        <div className="flex-1 min-w-0">
          <CalendarView
            events={visibleEvents}
            currentDate={currentDate}
            viewMode={viewMode}
            onDateChange={setCurrentDate}
            onViewModeChange={setViewMode}
            onEventClick={handleEventClick}
            onCreateEvent={handleCreateEvent}
          />
        </div>
      </div>

      {/* Event Modal */}
      {isEventModalOpen && (
        <EventModal
          isOpen={isEventModalOpen}
          onClose={handleModalClose}
          event={selectedEvent}
          selectedDate={selectedDate}
          calendars={calendars}
          onSave={handleEventSaved}
          onDelete={handleEventDeleted}
        />
      )}
    </div>
  );
}

