"use client";

import { useEffect, useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { Task } from "@/lib/types";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function NotificationManager() {
    const { tasks } = useStore();
    const processedNotifications = useRef<Set<string>>(new Set());
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [showTestButton, setShowTestButton] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);

    useEffect(() => {
        if ("Notification" in window) {
            setPermission(Notification.permission);
            // If already granted, ensure subscription is synced to DB
            if (Notification.permission === "granted") {
                subscribeToPush();
            }
        }

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        }
    }, []);

    const subscribeToPush = async () => {
        setIsSubscribing(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            // Sanitize key on client side too
            const cleanKey = VAPID_PUBLIC_KEY.replace(/[^a-zA-Z0-9-_]/g, '');
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(cleanKey)
            });

            // Save subscription to Supabase via Server Action (to bypass RLS)
            const { saveSubscription } = await import("@/app/actions");
            const result = await saveSubscription(JSON.parse(JSON.stringify(subscription)));

            if (!result.success) {
                throw new Error(result.message);
            }

            console.log("Subscription saved via server action");
            new Notification("通知設定完了", {
                body: "アプリを閉じていても通知が届くようになりました！",
                icon: "/icon.png"
            });
        } catch (error) {
            console.error('Failed to subscribe to push:', error);
            // Re-throw to be caught by the caller (Update Settings button)
            throw error;
        } finally {
            setIsSubscribing(false);
        }
    };

    const requestPermission = async () => {
        if (!("Notification" in window)) return;
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === "granted") {
            await subscribeToPush();
        }
    };

    const sendTestNotification = () => {
        if (permission === "granted") {
            new Notification("テスト通知", {
                body: "これはローカルテスト通知です。",
                icon: "/icon.png"
            });
        }
    };

    // Check for notifications every minute
    useEffect(() => {
        checkNotifications(tasks, processedNotifications.current);

        const intervalId = setInterval(() => {
            checkNotifications(tasks, processedNotifications.current);
        }, 30000);

        return () => clearInterval(intervalId);
    }, [tasks]);



    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {permission === "default" && (
                <button
                    onClick={requestPermission}
                    disabled={isSubscribing}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors animate-bounce disabled:opacity-70"
                >
                    {isSubscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                    通知を有効にする
                </button>
            )}

            {permission === "denied" && (
                <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg">
                    <BellOff className="h-4 w-4" />
                    通知がブロックされています
                </div>
            )}

            {permission === "granted" && (
                <div className="flex flex-col gap-2 animate-fade-in">
                    <button
                        onClick={async () => {
                            try {
                                await subscribeToPush();
                                alert("設定を更新しました。もう一度サーバーテストを試してください。");
                            } catch (e) {
                                alert("設定更新エラー: " + (e as any).message);
                            }
                        }}
                        className="bg-blue-600 text-white text-xs px-3 py-2 rounded shadow hover:bg-blue-700 transition-colors"
                    >
                        情報更新（解決用）
                    </button>
                    <button
                        onClick={sendTestNotification}
                        className="bg-gray-800 text-white text-xs px-3 py-2 rounded shadow opacity-70 hover:opacity-100 transition-opacity"
                    >
                        ローカル通知テスト
                    </button>
                    <button
                        onClick={async () => {
                            const { testPushNotification } = await import("@/app/actions");
                            try {
                                const result = await testPushNotification();
                                alert(result.message);
                            } catch (e) {
                                console.error(e);
                                alert("テスト送信に失敗しました");
                            }
                        }}
                        className="bg-indigo-600 text-white text-xs px-3 py-2 rounded shadow hover:bg-indigo-700 transition-colors"
                    >
                        サーバー通知テスト
                    </button>
                    <button
                        onClick={async () => {
                            const { diagnoseNotificationSystem } = await import("@/app/actions");
                            try {
                                alert("システム診断を開始します...");
                                const report = await diagnoseNotificationSystem();
                                alert(report);
                                console.log(report);
                            } catch (e) {
                                alert("診断エラー: " + (e as any).message);
                            }
                        }}
                        className="bg-red-600 text-white text-xs px-3 py-2 rounded shadow hover:bg-red-700 transition-colors"
                    >
                        システム診断を実行
                    </button>
                </div>
            )}
        </div>
    );
}

function checkNotifications(tasks: Task[], processed: Set<string>) {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
        return;
    }

    const now = new Date();
    const currentMinuteIso = now.toISOString().slice(0, 16);

    tasks.forEach(task => {
        if (!task.notificationTime || task.isCompleted) return;

        const taskTime = new Date(task.notificationTime);
        const taskMinuteIso = taskTime.toISOString().slice(0, 16);
        const notificationKey = `${task.id}-${taskMinuteIso}`;
        const timeDiff = now.getTime() - taskTime.getTime();
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
