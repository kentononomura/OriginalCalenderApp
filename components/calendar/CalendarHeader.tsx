"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale"; // Japanese locale for the user likely
import { cn } from "@/lib/utils";

interface CalendarHeaderProps {
    currentDate: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onToday: () => void;
}

export function CalendarHeader({
    currentDate,
    onPrevMonth,
    onNextMonth,
    onToday,
}: CalendarHeaderProps) {
    return (
        <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold capitalize text-foreground">
                    {format(currentDate, "yyyy年 MMMM", { locale: ja })}
                </h2>
                <div className="flex items-center rounded-md border border-input bg-background shadow-xs">
                    <button
                        onClick={onPrevMonth}
                        className="p-2 hover:bg-accent hover:text-accent-foreground border-r border-input"
                        aria-label="Previous month"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onToday}
                        className="px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                        今日
                    </button>
                    <button
                        onClick={onNextMonth}
                        className="p-2 hover:bg-accent hover:text-accent-foreground border-l border-input"
                        aria-label="Next month"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <Link href="/list" className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground border border-input bg-background shadow-xs" title="リスト表示">
                <List className="h-5 w-5" />
            </Link>
        </div>
    );
}
