import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ヘルパー：ISO文字列からJST（日本時間）の「YYYY-MM-DD」形式の文字列を取得
const getJstDateString = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date).replace(/\//g, '-');
};

// ヘルパー：ISO文字列からJSTの「HH:mm」形式の文字列を取得（00:00の場合は空文字を返す）
const getJstTimeFormatted = (isoString: string) => {
    try {
        const date = new Date(isoString);
        const timeStr = new Intl.DateTimeFormat('ja-JP', {
            timeZone: 'Asia/Tokyo',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(date);
        return timeStr === '00:00' ? '' : timeStr;
    } catch (e) {
        return '';
    }
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const password = searchParams.get('password');
    const targetDateParam = searchParams.get('date'); // オプション: YYYY-MM-DD

    if (!email || !password) {
        return NextResponse.json(
            { error: 'Email and password are required' },
            { status: 400 }
        );
    }

    // 1. スレッドセーフ（競合防止）のため、リクエストごとに新しいSupabaseクライアントを作成
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: false
            }
        }
    );

    // 2. ユーザーログイン認証を実行（これによりこのクライアントのセキュリティコンテキストがユーザーのものになる）
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError || !authData.user) {
        return NextResponse.json(
            { error: 'Authentication failed. Please check your credentials.' },
            { status: 401 }
        );
    }

    // 3. タスクデータの取得（RLSポリシーにより、ログインユーザーのデータのみ取得されます）
    const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('start_time', { ascending: true });

    if (tasksError) {
        return NextResponse.json(
            { error: tasksError.message },
            { status: 500 }
        );
    }

    // 4. 指定された日付、または本日のJST日付を取得
    let targetDateStr = targetDateParam;
    if (!targetDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) {
        targetDateStr = getJstDateString(new Date());
    }

    // 5. 日付に基づいたタスクのフィルタリング
    // タスクの開始日 <= 対象日 <= タスクの終了日 のタスクを本日のタスクとする
    const todayTasksRaw = tasks.filter((t: any) => {
        const startStr = getJstDateString(new Date(t.start_time));
        const endStr = getJstDateString(new Date(t.end_time));
        return targetDateStr! >= startStr && targetDateStr! <= endStr;
    });

    // 6. 優先度順（HIGH -> MEDIUM -> LOW）にソート
    const priorityWeight: Record<string, number> = {
        high: 3,
        medium: 2,
        low: 1
    };

    const sortedTasks = todayTasksRaw.sort((a: any, b: any) => {
        const weightA = priorityWeight[a.priority?.toLowerCase()] || 0;
        const weightB = priorityWeight[b.priority?.toLowerCase()] || 0;
        return weightB - weightA;
    });

    // 7. Scriptableウィジェット用に最適化されたデータ構造にマッピング
    const formattedTasks = sortedTasks.map((row: any) => ({
        id: row.id,
        title: row.content,
        description: row.description || "",
        startTime: getJstTimeFormatted(row.start_time),
        priority: row.priority.toUpperCase(), // 'HIGH', 'MEDIUM', 'LOW'
        categoryColor: row.category_color || '#8b5cf6',
        isCompleted: row.is_completed,
    }));

    // 統計情報の作成
    const totalCount = formattedTasks.length;
    const completedCount = formattedTasks.filter((t: any) => t.isCompleted).length;
    const remainingCount = totalCount - completedCount;

    return NextResponse.json({
        date: targetDateStr,
        summary: {
            total: totalCount,
            completed: completedCount,
            remaining: remainingCount
        },
        tasks: formattedTasks
    });
}
