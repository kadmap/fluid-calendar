"use client";

import { useState, useEffect, useRef } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { CalendarEvent, CalendarFeed } from "@/types/calendar";
import { useCalendarStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";
import { cn } from "@/lib/utils";
import { formatToLocalISOString, newDate } from "@/lib/date-utils";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { v4 as uuidv4 } from "uuid";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Partial<CalendarEvent>;
  defaultDate?: Date;
  defaultEndDate?: Date;
}

// Google Calendar recurrence rules
const FREQUENCIES = {
  NONE: "NONE",
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
} as const;

type Frequency = (typeof FREQUENCIES)[keyof typeof FREQUENCIES];

// RRule weekday codes
const WEEKDAYS = {
  SU: "Sunday",
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
} as const;

// Helper function to parse recurrence rule
function parseRecurrenceRule(rule?: string) {
  if (!rule) return { freq: FREQUENCIES.NONE, interval: 1, byDay: [] };

  // Remove RRULE: prefix and any array wrapper
  rule = rule.replace(/^\[?"?RRULE:/i, "").replace(/"?\]?$/, "");

  const parts = rule.split(";");
  const result = {
    freq: FREQUENCIES.NONE as Frequency,
    interval: 1,
    byDay: [] as string[],
  };

  parts.forEach((part) => {
    const [key, value] = part.split("=");
    switch (key) {
      case "FREQ":
        result.freq = value as Frequency;
        break;
      case "INTERVAL":
        result.interval = parseInt(value, 10);
        break;
      case "BYDAY":
        result.byDay = value.split(",");
        break;
    }
  });

  return result;
}

// Helper function to build recurrence rule
function buildRecurrenceRule(freq: string, interval: number, byDay: string[]) {
  if (freq === FREQUENCIES.NONE) return "";

  const parts = [];

  // Add frequency
  if (Object.values(FREQUENCIES).includes(freq as Frequency)) {
    parts.push(`FREQ=${freq}`);
  }

  // Add interval if greater than 1
  if (interval > 1) {
    parts.push(`INTERVAL=${interval}`);
  }

  // Add BYDAY for weekly recurrence
  if (freq === FREQUENCIES.WEEKLY && byDay.length > 0) {
    // byDay should already be in RRule format (MO, TU, etc.)
    console.log("Building RRule with weekdays:", byDay);
    parts.push(`BYDAY=${byDay.join(",")}`);
  }

  const rule = parts.join(";");
  console.log("Built RRule:", rule);
  return rule;
}

export function EventModal({
  isOpen,
  onClose,
  event,
  defaultDate,
  defaultEndDate,
}: EventModalProps) {
  const { feeds, addEvent, updateEvent, removeEvent, addFeed } =
    useCalendarStore();
  const { calendar } = useSettingsStore();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [showRecurrenceDialog, setShowRecurrenceDialog] = useState(false);
  const [editMode, setEditMode] = useState<"single" | "series">();
  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [location, setLocation] = useState(event?.location || "");
  const [startDate, setStartDate] = useState<Date>(
    event?.start
      ? newDate(event.start)
      : defaultDate
      ? newDate(defaultDate)
      : newDate()
  );
  const [endDate, setEndDate] = useState<Date>(
    event?.end
      ? newDate(event.end)
      : defaultEndDate
      ? newDate(defaultEndDate)
      : newDate(Date.now() + 3600000)
  );
  const [selectedFeedId, setSelectedFeedId] = useState<string>(
    event?.feedId || calendar.defaultCalendarId || ""
  );
  const [isAllDay, setIsAllDay] = useState(event?.allDay || false);
  const [isRecurring, setIsRecurring] = useState(event?.isRecurring || false);
  const [recurrenceFreq, setRecurrenceFreq] = useState("");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceByDay, setRecurrenceByDay] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create a default LOCAL calendar if none exists
  useEffect(() => {
    const createDefaultCalendarIfNeeded = async () => {
      if (feeds.length === 0) {
        try {
          // Try to create a calendar feed through the store function first
          const feedId = await addFeed(
            "My Calendar",
            "",
            "LOCAL",
            "#4285F4",
            false
          );
          console.log("Created default LOCAL calendar with id:", feedId);
          setSelectedFeedId(feedId);
        } catch (error) {
          console.log("Failed to create feed through store:", error);

          // Fallback: create directly in the store state
          const feedId = uuidv4();
          const defaultFeed: CalendarFeed = {
            id: feedId,
            name: "My Calendar",
            type: "LOCAL",
            color: "#4285F4",
            enabled: true,
          };

          useCalendarStore.setState((state) => ({
            feeds: [...state.feeds, defaultFeed],
          }));

          setSelectedFeedId(feedId);
          console.log("Created fallback LOCAL calendar with id:", feedId);
        }
      }
    };

    if (isOpen) {
      createDefaultCalendarIfNeeded();
    }
  }, [isOpen, feeds, addFeed]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset form fields
      setTitle(event?.title || "");
      setDescription(event?.description || "");
      setLocation(event?.location || "");
      setStartDate(
        event?.start
          ? newDate(event.start)
          : defaultDate
          ? newDate(defaultDate)
          : newDate()
      );
      setEndDate(
        event?.end
          ? newDate(event.end)
          : defaultEndDate
          ? newDate(defaultEndDate)
          : newDate(Date.now() + 3600000)
      );
      setIsAllDay(event?.allDay || false);
      setIsRecurring(event?.isRecurring || false);
      const { freq, interval, byDay } = parseRecurrenceRule(
        event?.recurrenceRule
      );
      setRecurrenceFreq(freq || "");
      setRecurrenceInterval(interval);
      setRecurrenceByDay(byDay);
      setEditMode(undefined);
      setShowRecurrenceDialog(false);

      // Focus the title input
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [
    isOpen,
    event,
    defaultDate,
    defaultEndDate,
    feeds,
    calendar.defaultCalendarId,
  ]);

  // Show recurrence dialog when editing a recurring event
  useEffect(() => {
    if (isOpen && event?.isRecurring && !editMode && !showRecurrenceDialog) {
      //todo: we need to handle editing series vs single, for now forcing to always edit series
      // setShowRecurrenceDialog(true);
      setEditMode("series");
    }
  }, [isOpen, event?.isRecurring, editMode, showRecurrenceDialog]);

  // Select the first available feed if none is selected
  useEffect(() => {
    if (isOpen && feeds.length > 0 && !selectedFeedId) {
      setSelectedFeedId(feeds[0].id);
    }
  }, [isOpen, feeds, selectedFeedId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log("Submitting event with data:", {
        title,
        description,
        location,
        startDate,
        endDate,
        selectedFeedId,
        isAllDay,
        isRecurring,
        recurrenceFreq,
        recurrenceInterval,
        recurrenceByDay,
      });

      const recurrenceRule = buildRecurrenceRule(
        recurrenceFreq,
        recurrenceInterval,
        recurrenceByDay
      );

      const eventData = {
        feedId: selectedFeedId,
        title,
        description,
        start: startDate,
        end: endDate,
        location,
        isRecurring: isRecurring || false,
        recurrenceRule,
        allDay: isAllDay || false,
        isMaster: false,
      };

      console.log("Sending event data to API:", eventData);

      if (event?.id) {
        await updateEvent(event.id, eventData, editMode);
        console.log("Event updated successfully");
      } else {
        await addEvent(eventData);
        console.log("Event created successfully");
      }

      onClose();
    } catch (error) {
      console.error("Failed to save event:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event?.id) return;

    try {
      setIsSubmitting(true);
      await removeEvent(event.id, editMode);
      resetState();
      onClose();
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert(error instanceof Error ? error.message : "Failed to delete event");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to render recurrence options
  const renderRecurrenceOptions = () => {
    if (!isRecurring) return null;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recurrence-freq">Repeats</Label>
          <Select
            value={recurrenceFreq || FREQUENCIES.WEEKLY}
            onValueChange={(value) =>
              setRecurrenceFreq(value === FREQUENCIES.NONE ? "" : value)
            }
          >
            <SelectTrigger id="recurrence-freq" data-testid="recurrence-freq">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FREQUENCIES.DAILY}>Daily</SelectItem>
              <SelectItem value={FREQUENCIES.WEEKLY}>Weekly</SelectItem>
              <SelectItem value={FREQUENCIES.MONTHLY}>Monthly</SelectItem>
              <SelectItem value={FREQUENCIES.YEARLY}>Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {recurrenceFreq && recurrenceFreq !== FREQUENCIES.NONE && (
          <>
            <div className="space-y-2">
              <Label htmlFor="recurrence-interval">Repeat every</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  id="recurrence-interval"
                  min="1"
                  value={recurrenceInterval}
                  onChange={(e) =>
                    setRecurrenceInterval(
                      Math.max(1, parseInt(e.target.value, 10))
                    )
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {recurrenceFreq.toLowerCase()}
                  {recurrenceInterval > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {recurrenceFreq === FREQUENCIES.WEEKLY && (
              <div className="space-y-2">
                <Label>Repeat on</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(WEEKDAYS).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={recurrenceByDay.includes(key)}
                        onCheckedChange={(checked) => {
                          setRecurrenceByDay(
                            checked
                              ? [...recurrenceByDay, key]
                              : recurrenceByDay.filter((d) => d !== key)
                          );
                        }}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-[500px] p-0 max-h-[90vh] flex flex-col">
          {isSubmitting && <LoadingOverlay />}
          <DialogHeader className="px-6 pt-6 pb-4 space-y-1.5">
            <DialogTitle>{event?.id ? "Edit Event" : "New Event"}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="px-6 pb-6 space-y-4 overflow-y-auto"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                type="text"
                id="title"
                ref={titleInputRef}
                data-testid="event-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="event-title"
                required
              />
            </div>
            {/* 
            <div className="space-y-2">
              <Label htmlFor="calendar">Calendar</Label>
              <Select
                value={selectedFeedId}
                onValueChange={(value) => setSelectedFeedId(value)}
                disabled={!!event?.id}
              >
                <SelectTrigger id="calendar" data-testid="calendar-select">
                  <SelectValue placeholder="Select a calendar" />
                </SelectTrigger>
                <SelectContent>
                  {feeds
                    .filter((feed) => feed.enabled)
                    .map((feed) => (
                      <SelectItem key={feed.id} value={feed.id}>
                        {feed.name} {feed.type === "GOOGLE" ? "(Google)" : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div> */}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Start</Label>
                <Input
                  type="datetime-local"
                  id="start"
                  data-testid="event-start-date"
                  value={formatToLocalISOString(startDate)}
                  onChange={(e) => setStartDate(newDate(e.target.value))}
                  className={cn(
                    "cursor-pointer px-3 py-2",
                    "[&::-webkit-calendar-picker-indicator]:ml-auto",
                    "[&::-webkit-calendar-picker-indicator]:mr-1",
                    "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
                    "[&::-webkit-calendar-picker-indicator]:rounded-md",
                    "[&::-webkit-calendar-picker-indicator]:hover:bg-accent",
                    "[&::-webkit-calendar-picker-indicator]:dark:invert",
                    "[&::-webkit-datetime-edit]:text-foreground",
                    "[&::-webkit-datetime-edit-fields-wrapper]:p-0"
                  )}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end">End</Label>
                <Input
                  type="datetime-local"
                  id="end"
                  data-testid="event-end-date"
                  value={formatToLocalISOString(endDate)}
                  onChange={(e) => setEndDate(newDate(e.target.value))}
                  className={cn(
                    "cursor-pointer px-3 py-2",
                    "[&::-webkit-calendar-picker-indicator]:ml-auto",
                    "[&::-webkit-calendar-picker-indicator]:mr-1",
                    "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
                    "[&::-webkit-calendar-picker-indicator]:rounded-md",
                    "[&::-webkit-calendar-picker-indicator]:hover:bg-accent",
                    "[&::-webkit-calendar-picker-indicator]:dark:invert",
                    "[&::-webkit-datetime-edit]:text-foreground",
                    "[&::-webkit-datetime-edit-fields-wrapper]:p-0"
                  )}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="all-day"
                checked={isAllDay}
                onCheckedChange={(checked) => setIsAllDay(checked as boolean)}
              />
              <Label htmlFor="all-day" className="text-sm">
                All day
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="event-location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                data-testid="event-description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="event-description resize-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => {
                  const isChecked = checked as boolean;
                  setIsRecurring(isChecked);
                  if (
                    isChecked &&
                    (recurrenceFreq === FREQUENCIES.NONE || !recurrenceFreq)
                  ) {
                    setRecurrenceFreq(FREQUENCIES.WEEKLY);
                    const weekdayNum = startDate.getDay();
                    const weekdays = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
                    const weekday = weekdays[weekdayNum];
                    setRecurrenceByDay([weekday]);
                  }
                }}
                data-testid="recurring-event-checkbox"
              />
              <Label htmlFor="recurring" className="text-sm">
                Recurring event
              </Label>
            </div>

            {renderRecurrenceOptions()}

            <div className="flex justify-between items-center pt-4">
              {event?.id ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  data-testid="delete-event-button"
                >
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="save-event-button">
                  {event?.id ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Recurring Event Edit Mode Dialog */}
      <AlertDialog.Root
        open={showRecurrenceDialog}
        onOpenChange={(open) => {
          setShowRecurrenceDialog(open);
          if (!open) onClose();
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[10001]" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg z-[10002] border">
            <AlertDialog.Title className="text-lg font-semibold mb-4">
              Edit Recurring Event
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground mb-6">
              Would you like to edit this event or the entire series?
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRecurrenceDialog(false);
                  onClose();
                }}
                data-testid="edit-cancel-button"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setEditMode("single");
                  setShowRecurrenceDialog(false);
                }}
                data-testid="edit-single-event-button"
              >
                This Event
              </Button>
              <Button
                onClick={() => {
                  setEditMode("series");
                  setShowRecurrenceDialog(false);
                }}
                data-testid="edit-series-button"
              >
                Entire Series
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );

  function resetState() {
    setShowRecurrenceDialog(false);
    setEditMode(undefined);
    setTitle("");
    setDescription("");
    setLocation("");
    setStartDate(newDate());
    setEndDate(newDate(Date.now() + 3600000));
    setIsAllDay(false);
    setIsRecurring(false);
    setRecurrenceFreq("");
    setRecurrenceInterval(1);
    setRecurrenceByDay([]);
  }
}
