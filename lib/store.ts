import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Task, AppSettings } from './types';
import { getTasks, saveTask, deleteTaskAction, toggleTaskCompletionAction } from '@/app/actions';

interface StoreState {
    tasks: Task[];
    settings: AppSettings;
    isLoading: boolean;

    // Actions
    fetchTasks: () => Promise<void>;
    addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
    updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    toggleTaskCompletion: (id: string) => Promise<void>;
    setThemeColor: (color: string) => void;
}

export const useStore = create<StoreState>((set, get) => ({
    tasks: [],
    settings: {
        themeColor: 'violet',
    },
    isLoading: false,

    fetchTasks: async () => {
        set({ isLoading: true });
        try {
            const tasks = await getTasks();
            set({ tasks, isLoading: false });
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
            set({ isLoading: false });
        }
    },

    addTask: async (taskData) => {
        const newTask: Task = {
            ...taskData,
            id: uuidv4(),
            isCompleted: taskData.isCompleted ?? false,
            createdAt: Date.now(),
        };

        // Optimistic update
        set((state) => ({ tasks: [...state.tasks, newTask] }));

        try {
            await saveTask(newTask);
        } catch (error) {
            console.error("Failed to save task:", error);
            // Rollback on error could be implemented here
        }
    },

    updateTask: async (id, updates) => {
        const tasks = get().tasks;
        const taskToUpdate = tasks.find(t => t.id === id);
        if (!taskToUpdate) return;

        const updatedTask = { ...taskToUpdate, ...updates };

        // Optimistic update
        set((state) => ({
            tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
        }));

        try {
            await saveTask(updatedTask);
        } catch (error) {
            console.error("Failed to update task:", error);
        }
    },

    deleteTask: async (id) => {
        // Optimistic update
        set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
        }));

        try {
            await deleteTaskAction(id);
        } catch (error) {
            console.error("Failed to delete task:", error);
        }
    },

    toggleTaskCompletion: async (id) => {
        // Optimistic update
        set((state) => ({
            tasks: state.tasks.map((task) =>
                task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
            ),
        }));

        try {
            await toggleTaskCompletionAction(id);
        } catch (error) {
            console.error("Failed to toggle completion:", error);
        }
    },

    setThemeColor: (color) => set((state) => ({
        settings: { ...state.settings, themeColor: color },
    })),
}));
