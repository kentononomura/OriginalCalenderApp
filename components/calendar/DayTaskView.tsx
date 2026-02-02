"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Plus, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DayTaskViewProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentDate: Date | undefined;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onAddTask: () => void;
}

export function DayTaskView({
    open,
    onOpenChange,
    currentDate,
    tasks,
    onTaskClick,
    onAddTask,
}: DayTaskViewProps) {
    if (!currentDate) return null;

    const dayTasks = tasks.sort((a, b) => {
        // Sort by priority first, then time
        const pWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const pDiff = pWeight[b.priority] - pWeight[a.priority];
        if (pDiff !== 0) return pDiff;
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-4 shadow-lg duration-200 rounded-lg">

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-bold">
                                {format(currentDate, "M月d日 (E)", { locale: ja })}
                            </h2>
                        </div>
                        <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </DialogPrimitive.Close>
                    </div>

                    {/* Task List */}
                    <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto py-2">
                        {dayTasks.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                タスクはありません
                            </div>
                        ) : (
                            dayTasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => onTaskClick(task)}
                                    className={cn(
                                        "p-3 rounded-md border border-border bg-accent/5 hover:bg-accent/10 transition-colors cursor-pointer flex gap-3",
                                        task.isCompleted && "opacity-60"
                                    )}
                                >
                                    <div className={cn(
                                        "w-1 self-stretch rounded-full",
                                        task.priority === 'HIGH' ? "bg-red-500" :
                                            task.priority === 'MEDIUM' ? "bg-yellow-500" : "bg-blue-500"
                                    )} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <h4 className={cn("font-medium truncate", task.isCompleted && "line-through")}>
                                                {task.title}
                                            </h4>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
                                            <Clock className="w-3 h-3" />
                                            <span>
                                                {format(parseISO(task.startDate), "HH:mm")}
                                                {task.startDate !== task.endDate && ` - ${format(parseISO(task.endDate), "HH:mm")}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add Button */}
                    <button
                        onClick={onAddTask}
                        className="flex items-center justify-center gap-2 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <Plus className="h-4 w-4" />
                        詳細を追加
                    </button>

                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
