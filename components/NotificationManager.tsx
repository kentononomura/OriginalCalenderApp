"use client";

import { useEffect, useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { Task } from "@/lib/types";
import { Bell, BellOff } from "lucide-react";

export function NotificationManager() {
    const { tasks } = useStore();
    const processedNotifications = useRef<Set<string>>(new Set());
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [showTestButton, setShowTestButton] = useState(false);

    useEffect(() => {
        if ("Notification" in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if (!("Notification" in window)) return;
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === "granted") {
            new Notification("通知設定完了", {
                body: "タスクの通知が届くようになりました！",
                icon: "/icon.png"
            });
        }
    };

    const sendTestNotification = () => {
        if (permission === "granted") {
            new Notification("テスト通知", {
                body: "これはテスト通知です。正常に動作しています。",
                icon: "/icon.png"
            });
        }
    };

    // Check for notifications every minute
    useEffect(() => {
        checkNotifications(tasks, processedNotifications.current);

        const intervalId = setInterval(() => {
            checkNotifications(tasks, processedNotifications.current);
        }, 30000); // Check every 30 seconds for better responsiveness

        return () => clearInterval(intervalId);
    }, [tasks]);

    if (permission === "granted" && !showTestButton) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {permission === "default" && (
                <button
                    onClick={requestPermission}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors animate-bounce"
                >
                    <Bell className="h-4 w-4" />
                    通知を有効にする
                </button>
            )}

            {permission === "denied" && (
                <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg">
                    <BellOff className="h-4 w-4" />
                    通知がブロックされています
                </div>
            )}

            {/* Hidden trigger for test button (triple click logic or similar could be better, but simple toggle for now) */}
            {permission === "granted" && (
                <button
                    onClick={sendTestNotification}
                    className="bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-50 hover:opacity-100"
                >
                    テスト通知送信
                </button>
            )}
        </div>
    );
}

function checkNotifications(tasks: Task[], processed: Set<string>) {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
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
        const notification = new Notification(`タスクの時間です: ${task.title}`, {
            body: task.description || "開始時間になりました。",
            icon: "/icon.png",
            tag: task.id,
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } catch (e) {
        console.error("Notification failed", e);
    }
}
