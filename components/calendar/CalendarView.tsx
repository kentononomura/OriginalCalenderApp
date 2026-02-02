"use client";

import React, { useState } from "react";
import { addMonths, subMonths, format, parseISO } from "date-fns";
import { CalendarHeader } from "./CalendarHeader";
import { MonthGrid } from "./MonthGrid";
import { DayTaskView } from "./DayTaskView";
import { Task } from "@/lib/types";
import { TaskForm } from "@/components/tasks/TaskForm";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CalendarView() {
    const { tasks } = useStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [isDayViewOpen, setIsDayViewOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));
    const handleToday = () => setCurrentDate(new Date());

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setIsDayViewOpen(true);
    };

    const handleTaskClick = (task: Task) => {
        setIsDayViewOpen(false); // Close day view if open
        setSelectedTask(task);
        setSelectedDate(undefined);
        setIsTaskFormOpen(true);
    };

    const handleAddTaskFromDayView = () => {
        setIsDayViewOpen(false);
        // selectedDate is already set
        setSelectedTask(null);
        setIsTaskFormOpen(true);
    }

    return (
        <div className="flex flex-col h-full bg-background text-foreground">
            <CalendarHeader
                currentDate={currentDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onToday={handleToday}
            />
            <div className="flex-1 overflow-hidden p-4 flex flex-col md:flex-row gap-4">
                {/* Calendar Section (Mobile: 60% Height, Desktop: 70% Width) */}
                <div className="flex-[6] md:flex-[7] min-h-0 rounded-lg border border-border bg-card shadow-sm overflow-hidden flex flex-col relative">
                    <MonthGrid
                        currentDate={currentDate}
                        onDateClick={handleDateClick}
                        onTaskClick={handleTaskClick}
                    />
                </div>

                {/* Today's Tasks Section (Mobile: 40% Height, Desktop: 30% Width) */}
                <div className="flex-[4] md:flex-[3] min-h-0 rounded-lg border border-border bg-card shadow-sm p-4 flex flex-col">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-primary">
                        <span className="bg-primary/20 p-1.5 rounded-md">📅</span>
                        今日のタスク
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {(() => {
                            const todayTasks = tasks.filter(t => {
                                const todayStr = format(new Date(), "yyyy-MM-dd");
                                const startStr = format(parseISO(t.startDate), "yyyy-MM-dd");
                                const endStr = format(parseISO(t.endDate), "yyyy-MM-dd");
                                return todayStr >= startStr && todayStr <= endStr;
                            }).sort((a, b) => {
                                const pWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
                                return pWeight[b.priority] - pWeight[a.priority];
                            });

                            if (todayTasks.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                                        <p>タスクはありません</p>
                                        <p className="text-sm opacity-60">ゆっくり休みましょう ☕</p>
                                    </div>
                                );
                            }

                            return todayTasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => handleTaskClick(task)}
                                    className={cn(
                                        "p-4 rounded-lg border border-border bg-accent/5 hover:bg-accent/10 transition-colors cursor-pointer flex items-start gap-4",
                                        task.isCompleted && "opacity-60"
                                    )}
                                >
                                    <div className={cn(
                                        "w-1.5 self-stretch rounded-full",
                                        task.priority === 'HIGH' ? "bg-red-500" :
                                            task.priority === 'MEDIUM' ? "bg-yellow-500" :
                                                "bg-blue-500"
                                    )} />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className={cn("font-bold text-lg", task.isCompleted && "line-through text-muted-foreground")}>
                                                {task.title}
                                            </h4>
                                            {task.priority === 'HIGH' && (
                                                <span className="text-[10px] font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20">
                                                    HIGH
                                                </span>
                                            )}
                                        </div>
                                        {task.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                                        )}
                                        <div className="mt-2 text-xs text-muted-foreground font-mono">
                                            {format(parseISO(task.startDate), "HH:mm") !== "00:00" && format(parseISO(task.startDate), "HH:mm")}
                                        </div>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            </div>

            <TaskForm
                open={isTaskFormOpen}
                onOpenChange={setIsTaskFormOpen}
                initialDate={selectedDate}
                initialTask={selectedTask}
            />

            <DayTaskView
                open={isDayViewOpen}
                onOpenChange={setIsDayViewOpen}
                currentDate={selectedDate}
                tasks={tasks.filter(t => {
                    if (!selectedDate) return false;
                    const dStr = format(selectedDate, "yyyy-MM-dd");
                    const startStr = format(parseISO(t.startDate), "yyyy-MM-dd");
                    const endStr = format(parseISO(t.endDate), "yyyy-MM-dd");
                    return dStr >= startStr && dStr <= endStr;
                })}
                onTaskClick={handleTaskClick}
                onAddTask={handleAddTaskFromDayView}
            />
        </div>
    );
}
