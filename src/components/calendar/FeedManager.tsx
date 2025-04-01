import { useState, useCallback } from "react";
import { useCalendarStore } from "@/store/calendar";
import { useViewStore } from "@/store/calendar";
import { BsTrash, BsArrowRepeat, BsGoogle, BsMicrosoft } from "react-icons/bs";
import { cn } from "@/lib/utils";
import { MiniCalendar } from "./MiniCalendar";
import { Checkbox } from "@/components/ui/checkbox";

export function FeedManager() {
  const { date: currentDate, setDate } = useViewStore();

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="py-4 border-b border-border">
        <MiniCalendar currentDate={currentDate} onDateClick={setDate} />
      </div>
    </div>
  );
}
