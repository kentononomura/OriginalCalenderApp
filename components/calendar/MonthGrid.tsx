"use client";

import React, { useMemo } from "react";
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    format,
    isToday,
    parseISO,
    isWithinInterval,
} from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Task } from "@/lib/types";

interface MonthGridProps {
    currentDate: Date;
    onDateClick: (date: Date) => void;
    onTaskClick: (task: Task) => void;
}

export function MonthGrid({
    currentDate,
    onDateClick,
    onTaskClick,
}: MonthGridProps) {
    const { tasks } = useStore();
    const fetchTasks = useStore((state) => state.fetchTasks);

    const days = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentDate]);

    React.useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Use client-side date for "Today" highlight to avoid server/client timezone mismatch (UTC vs JST)
    const [today, setToday] = React.useState<Date | null>(null);

    React.useEffect(() => {
        setToday(new Date());
    }, []);

    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

    // Simplified: No pre-filtering to avoid boundary bugs. Performance impact is negligible for typical task counts.
    const visibleTasks = tasks;

    // Render
    return (
        <div className="flex flex-col flex-1 h-full">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                {weekDays.map((day, i) => (
                    <div
                        key={i}
                        className={cn(
                            "py-2 text-center text-sm font-semibold text-muted-foreground",
                            i === 0 && "text-red-500", // Sunday
                            i === 6 && "text-blue-500" // Saturday
                        )}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {days.map((day, dayIdx) => {
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isDayToday = today && isSameDay(day, today);

                    // Find tasks for this day (robust string comparison)
                    const dayStr = format(day, "yyyy-MM-dd");
                    const dayTasks = visibleTasks.filter(t => {
                        const startStr = format(parseISO(t.startDate), "yyyy-MM-dd");
                        const endStr = format(parseISO(t.endDate), "yyyy-MM-dd");
                        return dayStr >= startStr && dayStr <= endStr;
                    }).sort((a, b) => {
                        const pWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
                        return pWeight[b.priority] - pWeight[a.priority];
                    });

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "min-h-0 md:min-h-[100px] border-b border-r border-border p-1 relative transition-colors hover:bg-muted/10 flex flex-col gap-1 cursor-pointer",
                                !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                                isDayToday && "bg-accent/10"
                            )}
                            onClick={() => onDateClick(day)}
                        >
                            <div className="flex items-center justify-between px-1">
                                <span
                                    className={cn(
                                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                                        isDayToday && "bg-primary text-primary-foreground",
                                        !isDayToday && "text-foreground"
                                    )}
                                >
                                    {format(day, "d")}
                                </span>
                                {/* Add task count or dot if space constraint */}
                            </div>

                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                {dayTasks.slice(0, 1).map(task => ( // Show max 1
                                    <div
                                        key={task.id}
                                        className={cn(
                                            "text-[10px] px-1 py-0.5 rounded truncate",
                                            "bg-primary/20 text-foreground border-l-2",
                                            task.priority === 'HIGH' && "border-red-500",
                                            task.priority === 'MEDIUM' && "border-yellow-500",
                                            task.priority === 'LOW' && "border-blue-500",
                                        )}
                                    >
                                        {task.title}
                                    </div>
                                ))}
                                {dayTasks.length > 1 && (
                                    <div className="flex justify-center -mt-1">
                                        <span className="text-[14px] text-muted-foreground leading-none tracking-widest">•••</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
