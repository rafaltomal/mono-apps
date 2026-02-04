// Storage module for Focus Timer

const STORAGE_KEY = 'mono-focus-timer';

function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const DEFAULT_SETTINGS = {
    workDuration: 25,  // minutes
    breakDuration: 5,  // minutes
    lastDate: null,    // for daily reset
    sessionsCompleted: 0,
    totalFocusTime: 0  // minutes
};

export function loadSettings() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            let settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };

            // Check if it's a new day - reset daily stats
            const today = getTodayKey();
            if (settings.lastDate !== today) {
                settings.sessionsCompleted = 0;
                settings.totalFocusTime = 0;
                settings.lastDate = today;
                saveSettings(settings);
            }

            return settings;
        }
        return { ...DEFAULT_SETTINGS, lastDate: getTodayKey() };
    } catch (error) {
        console.error('Error loading settings:', error);
        return { ...DEFAULT_SETTINGS, lastDate: getTodayKey() };
    }
}

export function saveSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

export function updateWorkDuration(minutes) {
    const settings = loadSettings();
    settings.workDuration = minutes;
    saveSettings(settings);
    return settings;
}

export function updateBreakDuration(minutes) {
    const settings = loadSettings();
    settings.breakDuration = minutes;
    saveSettings(settings);
    return settings;
}

export function incrementSession(focusMinutes) {
    const settings = loadSettings();
    settings.sessionsCompleted += 1;
    settings.totalFocusTime += focusMinutes;
    settings.lastDate = getTodayKey();
    saveSettings(settings);
    return settings;
}

export function resetStats() {
    const settings = loadSettings();
    settings.sessionsCompleted = 0;
    settings.totalFocusTime = 0;
    settings.lastDate = getTodayKey();
    saveSettings(settings);
    return settings;
}
