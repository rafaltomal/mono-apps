// Storage module for Habit Tracker
// Handles localStorage persistence

const STORAGE_KEY = 'mono-habit-tracker';

// Generate unique ID
export function generateId() {
    return Math.random().toString(36).substring(2, 11);
}

// Format date to YYYY-MM-DD
export function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Load habits from localStorage
export function loadHabits() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return [];
    } catch (error) {
        console.error('Error loading habits:', error);
        return [];
    }
}

// Save habits to localStorage
export function saveHabits(habits) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
        return true;
    } catch (error) {
        console.error('Error saving habits:', error);
        return false;
    }
}

// Create a new habit
export function createHabit(name) {
    return {
        id: generateId(),
        name: name.trim(),
        createdAt: new Date().toISOString(),
        completedDates: []
    };
}

// Check if habit is completed on a specific date
export function isCompletedOnDate(habit, dateKey) {
    return habit.completedDates.includes(dateKey);
}

// Toggle habit completion for a date
export function toggleCompletion(habit, dateKey) {
    const index = habit.completedDates.indexOf(dateKey);
    if (index === -1) {
        habit.completedDates.push(dateKey);
    } else {
        habit.completedDates.splice(index, 1);
    }
    return habit;
}

// Get days in month
export function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// Get all dates for a month
export function getDatesForMonth(year, month) {
    const daysInMonth = getDaysInMonth(year, month);
    const dates = [];
    for (let day = 1; day <= daysInMonth; day++) {
        dates.push(new Date(year, month, day));
    }
    return dates;
}

// Format month and year for display
export function formatMonthYear(date) {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Check if date is today
export function isToday(date) {
    const today = new Date();
    return formatDateKey(date) === formatDateKey(today);
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
