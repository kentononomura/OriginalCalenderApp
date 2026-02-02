"use client";

import React, { useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Check } from "lucide-react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { Task, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TaskFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialDate?: Date;
    initialTask?: Task | null;
}

export function TaskForm({ open, onOpenChange, initialDate, initialTask }: TaskFormProps) {
    const { addTask, updateTask, deleteTask } = useStore();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<Priority>("MEDIUM");
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("09:00");
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("10:00");
    const [isCompleted, setIsCompleted] = useState(false);

    // Notification state
    const [enableNotification, setEnableNotification] = useState(false);
    const [notificationDate, setNotificationDate] = useState("");
    const [notificationTime, setNotificationTime] = useState("");

    useEffect(() => {
        if (open) {
            if (initialTask) {
                setTitle(initialTask.title);
                setDescription(initialTask.description || "");
                setPriority(initialTask.priority);
                // Split ISO string to Date and Time
                const startObj = new Date(initialTask.startDate);
                const endObj = new Date(initialTask.endDate);
                setStartDate(format(startObj, "yyyy-MM-dd"));
                setStartTime(format(startObj, "HH:mm"));
                setEndDate(format(endObj, "yyyy-MM-dd"));
                setEndTime(format(endObj, "HH:mm"));
                setIsCompleted(initialTask.isCompleted);

                if (initialTask.notificationTime) {
                    const notifyObj = new Date(initialTask.notificationTime);
                    setEnableNotification(true);
                    setNotificationDate(format(notifyObj, "yyyy-MM-dd"));
                    setNotificationTime(format(notifyObj, "HH:mm"));
                } else {
                    setEnableNotification(false);
                    setNotificationDate("");
                    setNotificationTime("");
                }
            } else {
                // New task
                setTitle("");
                setDescription("");
                setPriority("MEDIUM");
                const dateStr = initialDate ? format(initialDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
                setStartDate(dateStr);
                setStartTime("09:00");
                setEndDate(dateStr);
                setEndTime("10:00");
                setIsCompleted(false);

                // Default notification settings (off by default)
                setEnableNotification(false);
                setNotificationDate(dateStr);
                setNotificationTime("08:50"); // Default to 10 mins before 9am
            }
        }
    }, [open, initialTask, initialDate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return;

        if (initialTask) {
            updateTask(initialTask.id, {
                title,
                description,
                priority,
                startDate: new Date(`${startDate}T${startTime}`).toISOString(),
                endDate: new Date(`${endDate}T${endTime}`).toISOString(),
                isCompleted,
                notificationTime: enableNotification && notificationDate && notificationTime
                    ? new Date(`${notificationDate}T${notificationTime}`).toISOString()
                    : undefined,
            });
        } else {
            addTask({
                title,
                description,
                priority,
                categoryColor: "#blue", // Default for now
                startDate: new Date(`${startDate}T${startTime}`).toISOString(),
                endDate: new Date(`${endDate}T${endTime}`).toISOString(),
                isCompleted,
                notificationTime: enableNotification && notificationDate && notificationTime
                    ? new Date(`${notificationDate}T${notificationTime}`).toISOString()
                    : undefined,
            });
        }
        onOpenChange(false);
    };

    const handleDelete = () => {
        if (initialTask) {
            deleteTask(initialTask.id);
            onOpenChange(false);
        }
    }

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg sm:max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-lg duration-200 sm:rounded-lg">
                    <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                        <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight text-foreground">
                            {initialTask ? "タスクを編集" : "新しいタスク"}
                        </DialogPrimitive.Title>
                    </div>
                    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label htmlFor="title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">タイトル</label>
                            <input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                                placeholder="タスク名を入力"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="priority" className="text-sm font-medium leading-none text-foreground">優先度</label>
                            <select
                                id="priority"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as Priority)}
                                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                            >
                                <option value="HIGH">高 (High)</option>
                                <option value="MEDIUM">中 (Medium)</option>
                                <option value="LOW">低 (Low)</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label htmlFor="startDate" className="text-sm font-medium leading-none text-foreground">開始</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        id="startDate"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs text-foreground [color-scheme:dark]"
                                        required
                                    />
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs text-foreground [color-scheme:dark]"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="endDate" className="text-sm font-medium leading-none text-foreground">終了</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        id="endDate"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs text-foreground [color-scheme:dark]"
                                        required
                                    />
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs text-foreground [color-scheme:dark]"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 py-2">
                            <input
                                type="checkbox"
                                id="enableNotification"
                                checked={enableNotification}
                                onChange={(e) => setEnableNotification(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="enableNotification" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                                通知を設定する
                            </label>
                        </div>

                        {enableNotification && (
                            <div className="grid gap-2 animate-in fade-in-0 duration-200">
                                <label htmlFor="notificationDate" className="text-sm font-medium leading-none text-foreground">通知日時</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        id="notificationDate"
                                        value={notificationDate}
                                        onChange={(e) => setNotificationDate(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs text-foreground [color-scheme:dark]"
                                        required={enableNotification}
                                    />
                                    <input
                                        type="time"
                                        value={notificationTime}
                                        onChange={(e) => setNotificationTime(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs text-foreground [color-scheme:dark]"
                                        required={enableNotification}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <label htmlFor="description" className="text-sm font-medium leading-none text-foreground">詳細 (オプション)</label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                                placeholder="タスクの詳細..."
                            />
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            {initialTask && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 h-9 px-4 py-2"
                                >
                                    削除
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsCompleted(!isCompleted)}
                                className={cn(
                                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 mr-auto",
                                    isCompleted
                                        ? "bg-green-600 text-white hover:bg-green-700 shadow-xs"
                                        : "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                                )}
                            >
                                {isCompleted ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        完了済み
                                    </>
                                ) : (
                                    "完了にする"
                                )}
                            </button>
                            <div className="flex gap-2 ml-auto">
                                <button
                                    type="button"
                                    onClick={() => onOpenChange(false)}
                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 h-9 px-4 py-2"
                                >
                                    保存
                                </button>
                            </div>
                        </div>
                    </form>
                    <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground text-foreground">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
