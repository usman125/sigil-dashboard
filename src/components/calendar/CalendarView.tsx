"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { DecryptedEvent } from "@/lib/calendar-api";
import { cn } from "@/lib/utils";

type ViewMode = "month" | "week" | "day";

interface CalendarViewProps {
  events: DecryptedEvent[];
  currentDate: Date;
  viewMode: ViewMode;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onEventClick: (event: DecryptedEvent) => void;
  onCreateEvent: (date: Date) => void;
}

// Helper functions
function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Add days from previous month to start on Sunday
  const startDayOfWeek = firstDay.getDay();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push(date);
  }
  
  // Add all days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  
  // Add days from next month to complete the grid (6 rows)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }
  
  return days;
}

function getWeekDays(date: Date): Date[] {
  const days: Date[] = [];
  const dayOfWeek = date.getDay();
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - dayOfWeek);
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  
  return days;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getEventsForDay(events: DecryptedEvent[], date: Date): DecryptedEvent[] {
  return events.filter((event) => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    return eventStart <= dayEnd && eventEnd >= dayStart;
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CalendarView({
  events,
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  onEventClick,
  onCreateEvent,
}: CalendarViewProps) {
  const today = new Date();
  
  // Navigation functions
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    onDateChange(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  // Generate days based on view mode
  const days = useMemo(() => {
    if (viewMode === "month") {
      return getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    } else if (viewMode === "week") {
      return getWeekDays(currentDate);
    } else {
      return [currentDate];
    }
  }, [currentDate, viewMode]);

  // Generate hours for day/week view
  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => i);
  }, []);

  // Header title
  const headerTitle = useMemo(() => {
    if (viewMode === "month") {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (viewMode === "week") {
      const weekDays = getWeekDays(currentDate);
      const startMonth = MONTHS[weekDays[0].getMonth()];
      const endMonth = MONTHS[weekDays[6].getMonth()];
      if (startMonth === endMonth) {
        return `${startMonth} ${currentDate.getFullYear()}`;
      }
      return `${startMonth} - ${endMonth} ${currentDate.getFullYear()}`;
    } else {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    }
  }, [currentDate, viewMode]);

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* Navigation Row */}
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={goToToday}
            className="px-3 md:px-4 py-2 text-sm font-medium bg-[var(--muted)] hover:bg-[var(--border)] rounded-lg transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevious}
              className="p-1.5 md:p-2 hover:bg-[var(--muted)] rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={goToNext}
              className="p-1.5 md:p-2 hover:bg-[var(--muted)] rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
          <h2 className="text-base md:text-xl font-semibold truncate">{headerTitle}</h2>
        </div>

        {/* View Mode Buttons */}
        <div className="flex bg-[var(--muted)] rounded-lg p-1 self-start sm:self-auto">
          {(["month", "week", "day"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={cn(
                "px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded-md transition-colors capitalize",
                viewMode === mode
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Month View */}
      {viewMode === "month" && (
        <div className="flex-1 bg-[var(--card)] rounded-xl md:rounded-2xl border border-[var(--border)] overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {WEEKDAYS.map((day, idx) => (
              <div
                key={day}
                className="py-2 md:py-3 text-center text-xs md:text-sm font-medium text-[var(--muted-foreground)]"
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{WEEKDAYS_SHORT[idx]}</span>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 grid-rows-6 h-[calc(100%-36px)] md:h-[calc(100%-44px)]">
            {days.map((day, index) => {
              const dayEvents = getEventsForDay(events, day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={index}
                  onClick={() => onCreateEvent(day)}
                  className={cn(
                    "border-b border-r border-[var(--border)] p-0.5 md:p-1 min-h-[60px] md:min-h-[100px] cursor-pointer hover:bg-[var(--muted)]/50 transition-colors",
                    !isCurrentMonth && "bg-[var(--muted)]/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5 md:mb-1">
                    <span
                      className={cn(
                        "w-5 h-5 md:w-7 md:h-7 flex items-center justify-center text-xs md:text-sm rounded-full",
                        isToday
                          ? "bg-[var(--primary)] text-white font-semibold"
                          : !isCurrentMonth
                          ? "text-[var(--muted-foreground)]"
                          : ""
                      )}
                    >
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] md:text-xs text-[var(--muted-foreground)]">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                  {/* Events - Hide on very small screens, show dots instead */}
                  <div className="hidden sm:block space-y-0.5 md:space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className="text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: `${event.calendarColor}20`,
                          borderLeft: `2px solid ${event.calendarColor}`,
                        }}
                      >
                        <span className="hidden md:inline">
                          {event.isAllDay ? (
                            event.title
                          ) : (
                            <>
                              <span className="font-medium">
                                {formatTime(event.startTime)}
                              </span>{" "}
                              {event.title}
                            </>
                          )}
                        </span>
                        <span className="md:hidden truncate">{event.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] md:text-xs text-[var(--muted-foreground)] px-1">
                        +{dayEvents.length - 2}
                      </div>
                    )}
                  </div>
                  {/* Mobile: Show dots for events */}
                  <div className="sm:hidden flex gap-0.5 flex-wrap">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event._id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: event.calendarColor }}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-[var(--muted-foreground)]">+</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === "week" && (
        <div className="flex-1 bg-[var(--card)] rounded-xl md:rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col">
          {/* Weekday Headers */}
          <div className="grid grid-cols-8 border-b border-[var(--border)]">
            <div className="py-2 md:py-3 px-1 md:px-2 text-center text-xs md:text-sm font-medium text-[var(--muted-foreground)]" />
            {days.map((day, index) => (
              <div
                key={index}
                className={cn(
                  "py-1.5 md:py-3 text-center border-l border-[var(--border)]",
                  isSameDay(day, today) && "bg-[var(--primary)]/10"
                )}
              >
                <div className="text-[10px] md:text-sm font-medium text-[var(--muted-foreground)]">
                  <span className="hidden sm:inline">{WEEKDAYS[day.getDay()]}</span>
                  <span className="sm:hidden">{WEEKDAYS_SHORT[day.getDay()]}</span>
                </div>
                <div
                  className={cn(
                    "text-sm md:text-lg font-semibold",
                    isSameDay(day, today) && "text-[var(--primary)]"
                  )}
                >
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="grid grid-cols-8 min-w-[400px]">
              {/* Time labels */}
              <div className="border-r border-[var(--border)]">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-10 md:h-12 text-[10px] md:text-xs text-[var(--muted-foreground)] text-right pr-1 md:pr-2 pt-1"
                  >
                    {hour === 0 ? "" : `${hour}:00`}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((day, dayIndex) => {
                const dayEvents = getEventsForDay(events, day);
                return (
                  <div
                    key={dayIndex}
                    className="relative border-l border-[var(--border)]"
                    onClick={() => onCreateEvent(day)}
                  >
                    {/* Hour cells */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="h-10 md:h-12 border-b border-[var(--border)] hover:bg-[var(--muted)]/30 cursor-pointer"
                      />
                    ))}

                    {/* Events */}
                    {dayEvents.map((event) => {
                      const startHour =
                        event.startTime.getHours() +
                        event.startTime.getMinutes() / 60;
                      const endHour =
                        event.endTime.getHours() +
                        event.endTime.getMinutes() / 60;
                      const top = startHour * 40; // 40px per hour on mobile (h-10)
                      const height = Math.max((endHour - startHour) * 40, 20);

                      if (event.isAllDay) return null;

                      return (
                        <div
                          key={event._id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                          className="absolute left-0.5 right-0.5 rounded px-0.5 md:px-1 py-0.5 text-[10px] md:text-xs overflow-hidden cursor-pointer hover:opacity-80"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            backgroundColor: `${event.calendarColor}30`,
                            borderLeft: `2px solid ${event.calendarColor}`,
                          }}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="text-[var(--muted-foreground)] hidden md:block">
                            {formatTime(event.startTime)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Day View */}
      {viewMode === "day" && (
        <div className="flex-1 bg-[var(--card)] rounded-xl md:rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col">
          {/* All-day events */}
          <div className="border-b border-[var(--border)] p-2 min-h-[40px]">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">All day</div>
            <div className="flex gap-2 flex-wrap">
              {getEventsForDay(events, currentDate)
                .filter((e) => e.isAllDay)
                .map((event) => (
                  <div
                    key={event._id}
                    onClick={() => onEventClick(event)}
                    className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: `${event.calendarColor}20`,
                      borderLeft: `3px solid ${event.calendarColor}`,
                    }}
                  >
                    {event.title}
                  </div>
                ))}
            </div>
          </div>

          {/* Time Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-12 relative">
              {/* Time labels */}
              <div className="col-span-2 md:col-span-1 border-r border-[var(--border)]">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-12 md:h-16 text-[10px] md:text-xs text-[var(--muted-foreground)] text-right pr-1 md:pr-2 pt-1"
                  >
                    {hour === 0 ? "" : `${hour}:00`}
                  </div>
                ))}
              </div>

              {/* Day column */}
              <div className="col-span-10 md:col-span-11 relative">
                {/* Hour cells */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    onClick={() => {
                      const date = new Date(currentDate);
                      date.setHours(hour, 0, 0, 0);
                      onCreateEvent(date);
                    }}
                    className="h-12 md:h-16 border-b border-[var(--border)] hover:bg-[var(--muted)]/30 cursor-pointer"
                  />
                ))}

                {/* Events */}
                {getEventsForDay(events, currentDate)
                  .filter((e) => !e.isAllDay)
                  .map((event) => {
                    const startHour =
                      event.startTime.getHours() +
                      event.startTime.getMinutes() / 60;
                    const endHour =
                      event.endTime.getHours() +
                      event.endTime.getMinutes() / 60;
                    const topMobile = startHour * 48; // 48px per hour on mobile (h-12)
                    const heightMobile = Math.max((endHour - startHour) * 48, 24);

                    return (
                      <div
                        key={event._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className="absolute left-0.5 md:left-1 right-0.5 md:right-1 rounded p-1 md:p-2 overflow-hidden cursor-pointer hover:opacity-80"
                        style={{
                          top: `${topMobile}px`,
                          height: `${heightMobile}px`,
                          backgroundColor: `${event.calendarColor}30`,
                          borderLeft: `3px solid ${event.calendarColor}`,
                        }}
                      >
                        <div className="font-medium text-sm md:text-base truncate">{event.title}</div>
                        <div className="text-xs md:text-sm text-[var(--muted-foreground)]">
                          {formatTime(event.startTime)} - {formatTime(event.endTime)}
                        </div>
                        {event.location && (
                          <div className="text-[10px] md:text-xs text-[var(--muted-foreground)] mt-1 hidden md:block">
                            {event.location}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





