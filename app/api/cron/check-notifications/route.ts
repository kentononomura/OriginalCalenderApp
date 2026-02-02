import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY?.trim()!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT?.trim()!;
const CRON_SECRET = process.env.CRON_SECRET?.trim()!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export async function GET(request: NextRequest) {
    try {
        // 1. Authorization
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
            console.error("VAPID keys are missing");
            return new NextResponse('Server Configuration Error: VAPID keys missing', { status: 500 });
        }

        if (!SUPABASE_SERVICE_ROLE_KEY) {
            console.error("SUPABASE_SERVICE_ROLE_KEY is missing");
            return new NextResponse('Server Configuration Error: Service Role Key missing', { status: 500 });
        }

        // Sanitize Public Key
        const safePublicKey = VAPID_PUBLIC_KEY
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        webpush.setVapidDetails(
            VAPID_SUBJECT,
            safePublicKey,
            VAPID_PRIVATE_KEY
        );

        // 2. Init Admin Client (Bypass RLS)
        // We use the supabase-js createClient directly to use the service role key
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // 3. Get current time (UTC minute precision)
        const now = new Date();
        // Calculate start and end of minute
        now.setSeconds(0, 0);
        const startOfMinuteIso = now.toISOString(); // e.g., ...:00.000Z

        now.setSeconds(59, 999);
        const endOfMinuteIso = now.toISOString();   // e.g., ...:59.999Z

        // 4. Find tasks
        const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .gte('notification_time', startOfMinuteIso)
            .lte('notification_time', endOfMinuteIso)
            .eq('is_completed', false);

        if (tasksError) {
            console.error('Db Error (Tasks)', tasksError);
            return NextResponse.json({ error: tasksError.message }, { status: 500 });
        }

        if (!tasks || tasks.length === 0) {
            return NextResponse.json({ message: 'No tasks to notify' });
        }

        // 5. Send Notifications
        // We fetch subscriptions separately to avoid join issues (and we have the user_ids now)
        const results = await Promise.all(tasks.map(async (task) => {
            const { data: subs, error: subsError } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('user_id', task.user_id);

            if (subsError) {
                console.error('Db Error (Subs)', subsError);
                return { task: task.id, status: 'db_error' };
            }

            if (!subs || subs.length === 0) return { task: task.id, status: 'no_subs' };

            const sendPromises = subs.map(async (sub) => {
                try {
                    await webpush.sendNotification({
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth
                        }
                    }, JSON.stringify({
                        title: `タスクの時間です: ${task.content}`,
                        body: task.description || "開始時間になりました。",
                        url: "/"
                    }));
                    return 'sent';
                } catch (err: any) {
                    if (err.statusCode === 410) {
                        // Subscription expired
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

    } catch (e: any) {
        console.error("Unexpected error", e);
        return new NextResponse(`Internal Server Error: ${e.message}`, { status: 500 });
    }
}
