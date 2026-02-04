// Storage module for Workout Tracker
// Handles localStorage persistence
// Workouts are stored as weekly templates (by day: 0-6)
// Completion states are stored per specific date

const STORAGE_KEY = 'mono-workout-tracker';

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

// Get day of week (0 = Monday, 6 = Sunday)
export function getDayOfWeek(date) {
    const day = date.getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Monday=0 based
}

// Get default data structure
function getDefaultData() {
    return {
        // Weekly templates: workouts by day of week (0-6, Monday-Sunday)
        templates: {
            0: [], // Monday
            1: [], // Tuesday
            2: [], // Wednesday
            3: [], // Thursday
            4: [], // Friday
            5: [], // Saturday
            6: []  // Sunday
        },
        // Completion states per specific date
        completions: {}
    };
}

// Load data from localStorage
export function loadData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            // Check if data has new structure
            if (data.templates) {
                return data;
            }
            // Old data structure - clear and start fresh
            const newData = getDefaultData();
            saveData(newData);
            return newData;
        }
        return getDefaultData();
    } catch (error) {
        console.error('Error loading data:', error);
        return getDefaultData();
    }
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

// Add workout template for a day of week
export function addWorkout(data, dateKey) {
    const date = new Date(dateKey);
    const dayOfWeek = getDayOfWeek(date);

    if (!data.templates[dayOfWeek]) {
        data.templates[dayOfWeek] = [];
    }

    const workout = {
        id: generateId(),
        name: '',
        type: 'sets',
        sets: 3,
        timerMinutes: 3
    };

    data.templates[dayOfWeek].push(workout);
    saveData(data);
    return workout;
}

// Update workout template
export function updateWorkout(data, dateKey, workoutId, updates) {
    const date = new Date(dateKey);
    const dayOfWeek = getDayOfWeek(date);

    if (data.templates[dayOfWeek]) {
        const workout = data.templates[dayOfWeek].find(w => w.id === workoutId);
        if (workout) {
            // Only update template properties (not completion states)
            if (updates.name !== undefined) workout.name = updates.name;
            if (updates.type !== undefined) workout.type = updates.type;
            if (updates.sets !== undefined) workout.sets = updates.sets;
            if (updates.timerMinutes !== undefined) workout.timerMinutes = updates.timerMinutes;
            saveData(data);
        }
    }

    // Update completion state for this specific date
    if (updates.completedSets !== undefined ||
        updates.timerElapsed !== undefined ||
        updates.timerRunning !== undefined ||
        updates.timerCompleted !== undefined) {
        updateCompletion(data, dateKey, workoutId, updates);
    }
}

// Update completion state for a specific date
function updateCompletion(data, dateKey, workoutId, updates) {
    if (!data.completions[dateKey]) {
        data.completions[dateKey] = {};
    }
    if (!data.completions[dateKey][workoutId]) {
        data.completions[dateKey][workoutId] = {
            completedSets: [],
            timerElapsed: 0,
            timerRunning: false,
            timerCompleted: false
        };
    }

    const completion = data.completions[dateKey][workoutId];
    if (updates.completedSets !== undefined) completion.completedSets = updates.completedSets;
    if (updates.timerElapsed !== undefined) completion.timerElapsed = updates.timerElapsed;
    if (updates.timerRunning !== undefined) completion.timerRunning = updates.timerRunning;
    if (updates.timerCompleted !== undefined) completion.timerCompleted = updates.timerCompleted;

    saveData(data);
}

// Delete workout template
export function deleteWorkout(data, dateKey, workoutId) {
    const date = new Date(dateKey);
    const dayOfWeek = getDayOfWeek(date);

    if (data.templates[dayOfWeek]) {
        data.templates[dayOfWeek] = data.templates[dayOfWeek].filter(w => w.id !== workoutId);
        saveData(data);
    }
}

// Toggle set completion for a specific date
export function toggleSet(data, dateKey, workoutId, setIndex) {
    if (!data.completions[dateKey]) {
        data.completions[dateKey] = {};
    }
    if (!data.completions[dateKey][workoutId]) {
        data.completions[dateKey][workoutId] = {
            completedSets: [],
            timerElapsed: 0,
            timerRunning: false,
            timerCompleted: false
        };
    }

    const completion = data.completions[dateKey][workoutId];
    const idx = completion.completedSets.indexOf(setIndex);
    if (idx === -1) {
        completion.completedSets.push(setIndex);
    } else {
        completion.completedSets.splice(idx, 1);
    }
    saveData(data);
}

// Get workouts for a date (templates merged with completion state)
export function getWorkoutsForDate(data, dateKey) {
    const date = new Date(dateKey);
    const dayOfWeek = getDayOfWeek(date);
    const templates = data.templates[dayOfWeek] || [];
    const completions = data.completions[dateKey] || {};

    return templates.map(template => {
        const completion = completions[template.id] || {
            completedSets: [],
            timerElapsed: 0,
            timerRunning: false,
            timerCompleted: false
        };

        return {
            ...template,
            completedSets: completion.completedSets,
            timerElapsed: completion.timerElapsed,
            timerRunning: completion.timerRunning,
            timerCompleted: completion.timerCompleted
        };
    });
}

// Date utilities
export function getWeekDates(baseDate) {
    const dates = [];
    const start = new Date(baseDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);

    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date);
    }
    return dates;
}

export function formatWeekTitle(dates) {
    const first = dates[0];
    const last = dates[6];
    const options = { month: 'short', day: 'numeric' };
    const firstStr = first.toLocaleDateString('en-US', options);
    const lastStr = last.toLocaleDateString('en-US', options);
    return `${firstStr} - ${lastStr}`;
}

export function isToday(date) {
    const today = new Date();
    return formatDateKey(date) === formatDateKey(today);
}

export function getDayName(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}
