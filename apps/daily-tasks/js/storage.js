// Storage module for Daily Tasks
// Handles localStorage persistence

const STORAGE_KEY = 'mono-daily-tasks';

// Generate unique ID
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Format date to YYYY-MM-DD (used as storage key)
export function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Load all tasks from localStorage
export function loadTasks() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return {};
    } catch (error) {
        console.error('Error loading tasks:', error);
        return {};
    }
}

// Save all tasks to localStorage
export function saveTasks(tasks) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error('Error saving tasks:', error);
        return false;
    }
}

// Get tasks for a specific date
export function getTasksForDate(dateKey, allTasks) {
    return allTasks[dateKey] || [];
}

// Save tasks for a specific date
export function saveTasksForDate(dateKey, dateTasks, allTasks) {
    const updated = { ...allTasks, [dateKey]: dateTasks };
    saveTasks(updated);
    return updated;
}

// Create a new task
export function createTask(text) {
    return {
        id: generateId(),
        text: text,
        completed: false,
        timeSpent: 0,        // In seconds
        isActive: false,
        startTime: null      // Timestamp when timer started
    };
}

// Format time in seconds to display string
export function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
        return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Clear all data
export function clearAllData() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Error clearing data:', error);
        return false;
    }
}
