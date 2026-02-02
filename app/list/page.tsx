"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ArrowUpDown, CheckCircle2, Circle } from "lucide-react";
import { useStore } from "@/lib/store";
import { Task, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ListPage() {
    const { tasks, toggleTaskCompletion, deleteTask } = useStore();
    const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ACTIVE');
    const [sort, setSort] = useState<'DATE' | 'PRIORITY'>('DATE');

    const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };

    const filteredTasks = useMemo(() => {
        let result = tasks;

        // Filter
        if (filter === 'ACTIVE') {
            result = result.filter(t => !t.isCompleted);
        } else if (filter === 'COMPLETED') {
            result = result.filter(t => t.isCompleted);
        }

        // Sort
        return result.sort((a, b) => {
            if (sort === 'PRIORITY') {
                const diff = priorityWeight[b.priority] - priorityWeight[a.priority];
                if (diff !== 0) return diff;
            }
            // Date sort (fallback or primary)
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });
    }, [tasks, filter, sort]);

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-accent hover:text-accent-foreground rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-xl font-bold">タスクリスト</h1>
                </div>
            </div>

            {/* Controls */}
            <div className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-muted/20">
                <div className="flex bg-muted rounded-lg p-1">
                    {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                filter === f ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {f === 'ALL' ? 'すべて' : f === 'ACTIVE' ? '未完了' : '完了済み'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">並び替え:</span>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as 'DATE' | 'PRIORITY')}
                        className="h-9 rounded-md border border-input bg-card px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="DATE">日付順</option>
                        <option value="PRIORITY">優先度順</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-4 max-w-4xl mx-auto w-full">
                {filteredTasks.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                        タスクはありません
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTasks.map(task => (
                            <div key={task.id} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                                <button
                                    onClick={() => toggleTaskCompletion(task.id)}
                                    className={cn("mt-1", task.isCompleted ? "text-primary" : "text-muted-foreground")}
                                >
                                    {task.isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className={cn("font-semibold text-lg truncate", task.isCompleted && "line-through text-muted-foreground")}>
                                            {task.title}
                                        </h3>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                                            task.priority === 'HIGH' ? "text-red-500 border-red-500/20 bg-red-500/10" :
                                                task.priority === 'MEDIUM' ? "text-yellow-500 border-yellow-500/20 bg-yellow-500/10" :
                                                    "text-blue-500 border-blue-500/20 bg-blue-500/10"
                                        )}>
                                            {task.priority}
                                        </span>
                                    </div>

                                    <div className="text-sm text-muted-foreground mb-1 font-mono">
                                        {format(parseISO(task.startDate), "yyyy/MM/dd HH:mm")}
                                        {task.startDate !== task.endDate && ` - ${format(parseISO(task.endDate), "yyyy/MM/dd HH:mm")}`}
                                    </div>

                                    {task.description && (
                                        <p className="text-sm text-foreground/80 line-clamp-2">{task.description}</p>
                                    )}
                                </div>

                                <button
                                    onClick={() => deleteTask(task.id)}
                                    className="text-muted-foreground hover:text-destructive p-2"
                                >
                                    削除
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
