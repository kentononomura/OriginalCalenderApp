"use server";

import webpush from "web-push";
import { Task, Priority } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

export async function getTasks(): Promise<Task[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return [];
    }

    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('start_time', { ascending: true });

    if (error) {
        console.error("Failed to fetch tasks:", error);
        return [];
    }

    return data.map((row: any) => ({
        id: row.id,
        title: row.content,
        description: row.description || "",
        startDate: row.start_time,
        endDate: row.end_time,
        priority: row.priority.toUpperCase() as Priority,
        categoryColor: row.category_color || '#8b5cf6', // Use DB color or default
        isCompleted: row.is_completed,
        notificationTime: row.notification_time,
        createdAt: Number(row.created_at),
    }));
}

export async function saveTask(task: Task): Promise<Task> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    // Map TS Task to DB columns
    const dbTask = {
        id: task.id,
        content: task.title,
        description: task.description || "",
        priority: task.priority.toLowerCase(),
        category: 'default', // Constraint removed, value less relevant if we use color
        category_color: task.categoryColor,
        start_time: task.startDate,
        end_time: task.endDate,
        date: task.startDate.split('T')[0], // Extract YYYY-MM-DD
        is_completed: task.isCompleted,
        notification_time: task.notificationTime,
        created_at: task.createdAt,
        user_id: user.id
    };

    // Check if task exists (upsert)
    const { error } = await supabase
        .from('tasks')
        .upsert(dbTask);

    if (error) {
        console.error("Failed to save task:", error);
        throw error;
    }

    return task;
}

export async function deleteTaskAction(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Failed to delete task:", error);
        throw error;
    }
}

export async function toggleTaskCompletionAction(id: string): Promise<Task | null> {
    const supabase = await createClient();

    // First get the current status
    const { data: task } = await supabase
        .from('tasks')
        .select('is_completed')
        .eq('id', id)
        .single();

    if (!task) return null;

    const { data, error } = await supabase
        .from('tasks')
        .update({ is_completed: !task.is_completed })
        .eq('id', id)
        .select()
        .single();

    if (error || !data) {
        console.error("Failed to toggle task:", error);
        return null;
    }

    // Map back to TS Task (partial) - used by store to update state
    // Ideally we return the full mapped task, but we need the other fields.
    // Re-using the mapping logic would be better if extracted.
    return {
        id: data.id,
        title: data.content,
        description: data.description || "",
        startDate: data.start_time,
        endDate: data.end_time,
        priority: data.priority.toUpperCase() as Priority,
        categoryColor: data.category_color || '#8b5cf6',
        isCompleted: data.is_completed,
        notificationTime: data.notification_time,
        createdAt: Number(data.created_at),
    };
}

export async function testPushNotification(): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: "User not authenticated" };

    const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

    if (!subs || subs.length === 0) {
        return { success: false, message: "No subscription found" };
    }

    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()!;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY?.trim()!;
    const VAPID_SUBJECT = process.env.VAPID_SUBJECT?.trim()!;

    webpush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );

    let successCount = 0;
    let lastError = "";

    for (const sub of subs) {
        try {
            await webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            }, JSON.stringify({
                title: "サーバー通知テスト",
                body: "これはサーバーから直接送信されたテスト通知です。",
                url: "/"
            }));
            successCount++;
        } catch (error: any) {
            console.error("Test push failed:", error);
            lastError = error.message || JSON.stringify(error);
        }
    }

    if (successCount > 0) {
        return { success: true, message: `Sent ${successCount} notifications` };
    } else {
        return { success: false, message: `Failed to send. Error: ${lastError}` };
    }
}

export async function saveSubscription(subscription: any): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not authenticated" };
    }

    // Use Service Role Key for Admin Access to bypass RLS
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        return { success: false, message: "Server misconfiguration: No Service Role Key" };
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    const { error } = await adminSupabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
    }, { onConflict: 'endpoint' });

    if (error) {
        console.error("Failed to save subscription:", error);
        return { success: false, message: "Database Error: " + error.message };
    }

    return { success: true, message: "Subscription saved successfully" };
}
