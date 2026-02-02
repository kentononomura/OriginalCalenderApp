export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Task {
    id: string;
    title: string;
    description?: string;
    startDate: string; // ISO string for storage
    endDate: string;   // ISO string for storage
    priority: Priority;
    categoryColor: string; // Hex code or tailwind class
    isCompleted: boolean;
    notificationTime?: string; // ISO string for notification
    createdAt: number;
}

export interface AppSettings {
    themeColor: string; // e.g., 'blue', 'green', 'violet'
}
