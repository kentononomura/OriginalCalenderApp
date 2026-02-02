"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { format } from "date-fns";
import { Task } from "@/lib/types";

export function NotificationManager() {
    const { tasks, fetchTasks } = useStore();
    // Use a ref to track processed notifications to avoid duplicate alerts in strict mode / re-renders
    // Using a simple set of strings key: "taskId-notificationTime"
    const processedNotifications = useRef<Set<string>>(new Set());

    // Request permission on mount (or first interaction)
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Check for notifications every minute
    useEffect(() => {
        // Run immediately on mount/update
        checkNotifications(tasks, processedNotifications.current);

        const intervalId = setInterval(() => {
            checkNotifications(tasks, processedNotifications.current);
        }, 60000); // Check every minute

        return () => clearInterval(intervalId);
    }, [tasks]);

    return null; // This component does not render anything visually
}

function checkNotifications(tasks: Task[], processed: Set<string>) {
    if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
    }

    const now = new Date();
    // Normalize to minute precision for comparison
    const currentMinuteIso = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

    tasks.forEach(task => {
        if (!task.notificationTime || task.isCompleted) return;

        const taskTime = new Date(task.notificationTime);
        const taskMinuteIso = taskTime.toISOString().slice(0, 16);

        // Key for deduplication
        const notificationKey = `${task.id}-${taskMinuteIso}`;

        // Check if it's time (within the same minute) and not already processed
        // We also check if the time has passed but is within last 5 minutes (in case user opened app late)
        // For now, let's keep it strictly locally to the minute or just passed
        const timeDiff = now.getTime() - taskTime.getTime();

        // 0 <= timeDiff < 60000 means "it is happening now or just happened within last minute"
        // Also allow matching strings directly for exact minute precision issues
        const isTime = (timeDiff >= 0 && timeDiff < 60000) || currentMinuteIso === taskMinuteIso;

        if (isTime && !processed.has(notificationKey)) {
            sendNotification(task);
            processed.add(notificationKey);
        }
    });
}

function sendNotification(task: Task) {
    try {
        // Mobile browsers might require a service worker for background notifications,
        // but for an open PWA/web page, this works while the page is open.
        // For true background push notifications on mobile, simpler Web Push API + Service Worker is needed.
        // This implementation focuses on the active/background tab use case first.

        const notification = new Notification(`タスクの時間です: ${task.title}`, {
            body: task.description || "開始時間になりました。",
            icon: "/icon.png", // Assuming icon exists, or use default
            tag: task.id, // Replace existing notification for same task if any
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } catch (e) {
        console.error("Notification failed", e);
    }
}
