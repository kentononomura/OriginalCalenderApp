import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT!;
const CRON_SECRET = process.env.CRON_SECRET!;

webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

export async function GET(request: NextRequest) {
    // 1. Authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = await createClient();

    // 2. Get current time (UTC minute precision)
    const now = new Date();
    const currentMinuteIso = now.toISOString().slice(0, 16);
    // Also check previous minute to catch latency issues? Strict check for now.

    // 3. Find tasks
    const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*, push_subscriptions(endpoint, p256dh, auth, user_id)')
        .eq('notification_time', currentMinuteIso) // Exact match for now
        .eq('is_completed', false);

    if (tasksError) {
        console.error('Db Error', tasksError);
        return NextResponse.json({ error: tasksError.message }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
        return NextResponse.json({ message: 'No tasks to notify' });
    }

    // 4. Send Notifications
    const results = await Promise.all(tasks.map(async (task) => {
        // Ideally we joined subscriptions, but Supabase join might be tricky if not set up with FK properly in schema provided
        // Let's do a second query if join failed or just assume we need to fetch subs.
        // Actually, join is better. Let's assume user_id is the link.
        const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', task.user_id);

        if (!subs) return { task: task.id, status: 'no_subs' };

        const sendPromises = subs.map(async (sub) => {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: atob(sub.p256dh), // We stored it base64 encoded
                        auth: atob(sub.auth)
                    }
                }, JSON.stringify({
                    title: `タスクの時間です: ${task.content}`,
                    body: task.description || "開始時間になりました。",
                    url: "/"
                }));
                return 'sent';
            } catch (err: any) {
                if (err.statusCode === 410) {
                    // Subscription expired, delete it
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                    return 'expired';
                }
                console.error('Push error', err);
                return 'failed';
            }
        });

        return Promise.all(sendPromises);
    }));

    return NextResponse.json({ processed: tasks.length, results });
}
