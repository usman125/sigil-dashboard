"use client";

import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  AlignLeft,
  Trash2,
  Loader2,
  Bell,
  ChevronDown,
} from "lucide-react";
import {
  eventsApi,
  calendarApi,
  DecryptedCalendar,
  DecryptedEvent,
  Reminder,
} from "@/lib/calendar-api";
import { encryptField } from "@/lib/event-crypto";
import { getPrivateKeyForDecryption } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: DecryptedEvent | null;
  selectedDate: Date | null;
  calendars: DecryptedCalendar[];
  onSave: () => void;
  onDelete: () => void;
}

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#84cc16", // Lime
];

const REMINDER_OPTIONS = [
  { label: "None", value: -1 },
  { label: "At time of event", value: 0 },
  { label: "5 minutes before", value: 5 },
  { label: "15 minutes before", value: 15 },
  { label: "30 minutes before", value: 30 },
  { label: "1 hour before", value: 60 },
  { label: "1 day before", value: 1440 },
];

export default function EventModal({
  isOpen,
  onClose,
  event,
  selectedDate,
  calendars,
  onSave,
  onDelete,
}: EventModalProps) {
  const isEditing = !!event;

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState(30);

  // For new calendar creation
  const [showNewCalendar, setShowNewCalendar] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState("");
  const [newCalendarColor, setNewCalendarColor] = useState(COLORS[0]);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (event) {
      // Editing existing event
      setTitle(event.title);
      setDescription(event.description || "");
      setLocation(event.location || "");
      setIsAllDay(event.isAllDay);
      setSelectedCalendarId(event.calendarId);

      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      setStartDate(start.toISOString().split("T")[0]);
      setStartTime(start.toTimeString().slice(0, 5));
      setEndDate(end.toISOString().split("T")[0]);
      setEndTime(end.toTimeString().slice(0, 5));

      if (event.reminders?.length > 0) {
        setReminderMinutes(event.reminders[0].minutesBefore);
      }
    } else {
      // Creating new event
      const date = selectedDate || new Date();
      const startDateTime = new Date(date);
      const endDateTime = new Date(date);
      
      // Round to nearest hour
      startDateTime.setMinutes(0, 0, 0);
      if (startDateTime < new Date()) {
        startDateTime.setHours(new Date().getHours() + 1);
      }
      endDateTime.setTime(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour later

      setTitle("");
      setDescription("");
      setLocation("");
      setIsAllDay(false);
      setStartDate(startDateTime.toISOString().split("T")[0]);
      setStartTime(startDateTime.toTimeString().slice(0, 5));
      setEndDate(endDateTime.toISOString().split("T")[0]);
      setEndTime(endDateTime.toTimeString().slice(0, 5));
      setReminderMinutes(30);

      // Select default calendar
      const defaultCalendar = calendars.find((c) => c.isDefault);
      setSelectedCalendarId(defaultCalendar?._id || calendars[0]?._id || "");
    }

    setShowNewCalendar(false);
    setNewCalendarName("");
    setNewCalendarColor(COLORS[0]);
    setError(null);
  }, [isOpen, event, selectedDate, calendars]);

  // Get user's public key for encryption
  const getPublicKeyForEncryption = async (): Promise<JsonWebKey | null> => {
    // First try to get from session storage
    const { getPublicKey } = await import("@/lib/auth");
    const cachedKey = getPublicKey();
    if (cachedKey) {
      return cachedKey;
    }

    // Fallback: fetch from API
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();
      if (data.success && data.data?.publicKey) {
        // Cache it for future use
        const { setPublicKey } = await import("@/lib/auth");
        setPublicKey(data.data.publicKey);
        return data.data.publicKey;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Create new calendar
  const handleCreateCalendar = async () => {
    if (!newCalendarName.trim()) return;

    try {
      setIsSaving(true);
      
      // Get public key for encryption
      const publicKey = await getPublicKeyForEncryption();
      if (!publicKey) {
        setError("Unable to get encryption key. Please re-login.");
        return;
      }

      const encryptedName = await encryptField(newCalendarName, publicKey);
      const response = await calendarApi.createCalendar(
        encryptedName,
        newCalendarColor,
        calendars.length === 0
      );

      setSelectedCalendarId(response.data._id);
      setShowNewCalendar(false);
      onSave(); // Trigger refresh
    } catch (err) {
      console.error("Failed to create calendar:", err);
      setError("Failed to create calendar");
    } finally {
      setIsSaving(false);
    }
  };

  // Save event
  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!selectedCalendarId && !showNewCalendar) {
      if (calendars.length === 0) {
        setShowNewCalendar(true);
        return;
      }
      setError("Please select a calendar");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Get public key for encryption
      const publicKey = await getPublicKeyForEncryption();
      if (!publicKey) {
        setError("Unable to get encryption key. Please re-login.");
        return;
      }

      // Encrypt fields
      const encryptedTitle = await encryptField(title, publicKey);
      const encryptedDescription = description
        ? await encryptField(description, publicKey)
        : null;
      const encryptedLocation = location
        ? await encryptField(location, publicKey)
        : null;

      // Build dates
      const startDateTime = isAllDay
        ? new Date(`${startDate}T00:00:00`)
        : new Date(`${startDate}T${startTime}`);
      const endDateTime = isAllDay
        ? new Date(`${endDate}T23:59:59`)
        : new Date(`${endDate}T${endTime}`);

      // Validate dates
      if (endDateTime <= startDateTime && !isAllDay) {
        setError("End time must be after start time");
        return;
      }

      // Build reminders
      const reminders: Reminder[] =
        reminderMinutes >= 0
          ? [{ type: "notification", minutesBefore: reminderMinutes }]
          : [];

      if (isEditing && event) {
        // Update existing event
        await eventsApi.updateEvent(event._id, {
          calendarId: selectedCalendarId,
          title: encryptedTitle,
          description: encryptedDescription,
          location: encryptedLocation,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          isAllDay,
          reminders,
        });
      } else {
        // Create new event
        await eventsApi.createEvent({
          calendarId: selectedCalendarId,
          title: encryptedTitle,
          description: encryptedDescription,
          location: encryptedLocation,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          isAllDay,
          reminders,
        });
      }

      onSave();
    } catch (err) {
      console.error("Failed to save event:", err);
      setError("Failed to save event");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete event
  const handleDelete = async () => {
    if (!event) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this event?"
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await eventsApi.deleteEvent(event._id);
      onDelete();
    } catch (err) {
      console.error("Failed to delete event:", err);
      setError("Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit Event" : "New Event"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--muted)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-[var(--destructive)]/10 border border-[var(--destructive)]/30 rounded-lg text-sm text-[var(--destructive)]">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add title"
              className="w-full px-4 py-3 text-lg font-medium bg-transparent border-b border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors"
              autoFocus
            />
          </div>

          {/* Date and Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[var(--muted-foreground)]" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 bg-[var(--muted)] rounded-lg border border-transparent focus:border-[var(--primary)] outline-none"
                  />
                  {!isAllDay && (
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="px-3 py-2 bg-[var(--muted)] rounded-lg border border-transparent focus:border-[var(--primary)] outline-none"
                    />
                  )}
                  <span className="text-[var(--muted-foreground)]">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 bg-[var(--muted)] rounded-lg border border-transparent focus:border-[var(--primary)] outline-none"
                  />
                  {!isAllDay && (
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="px-3 py-2 bg-[var(--muted)] rounded-lg border border-transparent focus:border-[var(--primary)] outline-none"
                    />
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    className="rounded"
                  />
                  All day
                </label>
              </div>
            </div>
          </div>

          {/* Calendar Selection */}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[var(--muted-foreground)]" />
            <div className="flex-1">
              {showNewCalendar || calendars.length === 0 ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newCalendarName}
                    onChange={(e) => setNewCalendarName(e.target.value)}
                    placeholder="Calendar name"
                    className="w-full px-3 py-2 bg-[var(--muted)] rounded-lg border border-transparent focus:border-[var(--primary)] outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Color:
                    </span>
                    <div className="flex gap-1">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewCalendarColor(color)}
                          className={cn(
                            "w-6 h-6 rounded-full transition-transform",
                            newCalendarColor === color &&
                              "ring-2 ring-offset-2 ring-[var(--primary)]"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateCalendar}
                      disabled={!newCalendarName.trim() || isSaving}
                      className="px-3 py-1.5 text-sm bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                      Create Calendar
                    </button>
                    {calendars.length > 0 && (
                      <button
                        onClick={() => setShowNewCalendar(false)}
                        className="px-3 py-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCalendarId}
                    onChange={(e) => setSelectedCalendarId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[var(--muted)] rounded-lg border border-transparent focus:border-[var(--primary)] outline-none appearance-none"
                  >
                    {calendars.map((cal) => (
                      <option key={cal._id} value={cal._id}>
                        {cal.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowNewCalendar(true)}
                    className="text-sm text-[var(--primary)] hover:underline"
                  >
                    + New
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              className="flex-1 px-3 py-2 bg-[var(--muted)] rounded-lg border border-transparent focus:border-[var(--primary)] outline-none"
            />
          </div>

          {/* Description */}
          <div className="flex items-start gap-3">
            <AlignLeft className="w-5 h-5 text-[var(--muted-foreground)] mt-2" />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description"
              rows={3}
              className="flex-1 px-3 py-2 bg-[var(--muted)] rounded-lg border border-transparent focus:border-[var(--primary)] outline-none resize-none"
            />
          </div>

          {/* Reminder */}
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-[var(--muted-foreground)]" />
            <select
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(Number(e.target.value))}
              className="flex-1 px-3 py-2 bg-[var(--muted)] rounded-lg border border-transparent focus:border-[var(--primary)] outline-none appearance-none"
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--border)]">
          <div>
            {isEditing && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-3 py-2 text-[var(--destructive)] hover:bg-[var(--destructive)]/10 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

