// Storage module for Focus Flow
// Handles localStorage persistence

const STORAGE_KEY = 'mono-focus-flow-data';

// Default data structure
function getDefaultData() {
    return {
        tasks: [],
        settings: {
            startDate: null,
            endDate: null,
            tasksPerDay: 1,
            paceType: 'tasks-per-day', // 'end-date' or 'tasks-per-day'
            workingDays: [1, 2, 3, 4, 5] // Monday to Friday (0 = Sunday)
        },
        stats: {
            streak: 0,
            lastCompletedDate: null
        }
    };
}

// Save data to localStorage
export function saveData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving data:', error);
        return false;
    }
}

// Load data from localStorage
export function loadData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            // Merge with defaults to handle missing fields
            return { ...getDefaultData(), ...data };
        }
        return getDefaultData();
    } catch (error) {
        console.error('Error loading data:', error);
        return getDefaultData();
    }
}

// Clear all data
export function clearData() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Error clearing data:', error);
        return false;
    }
}

// Check if there's existing data
export function hasExistingData() {
    const data = loadData();
    return data.tasks && data.tasks.length > 0;
}

// Update a single task
export function updateTask(taskId, updates) {
    const data = loadData();
    const taskIndex = data.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        data.tasks[taskIndex] = { ...data.tasks[taskIndex], ...updates };
        saveData(data);
        return data;
    }
    return null;
}

// Update stats
export function updateStats(stats) {
    const data = loadData();
    data.stats = { ...data.stats, ...stats };
    saveData(data);
    return data;
}
