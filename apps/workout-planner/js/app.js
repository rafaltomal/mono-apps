// Main application module for Workout Tracker
// Handles state management and event binding

import {
    loadData,
    saveData,
    getWeekDates,
    formatWeekTitle,
    formatDateKey,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    toggleSet,
    getWorkoutsForDate
} from './storage.js';

import {
    renderDayTabs,
    renderWorkoutsList,
    updateWeekTitle
} from './ui.js';

// Application state
let data = loadData();
let currentWeekOffset = 0;
let selectedDateKey = formatDateKey(new Date());
let timerIntervals = {}; // Track running timer intervals

// Get current week dates
function getCurrentWeekDates() {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + (currentWeekOffset * 7));
    return getWeekDates(baseDate);
}

// Render the current view
function render() {
    const weekDates = getCurrentWeekDates();
    renderDayTabs(weekDates, selectedDateKey);
    updateWeekTitle(formatWeekTitle(weekDates));

    const workouts = getWorkoutsForDate(data, selectedDateKey);
    renderWorkoutsList(workouts, selectedDateKey);
}

// Start a timer for a workout
function startTimer(dateKey, workoutId) {
    // Clear any existing interval for this workout
    if (timerIntervals[workoutId]) {
        clearInterval(timerIntervals[workoutId]);
    }

    timerIntervals[workoutId] = setInterval(() => {
        const workouts = getWorkoutsForDate(data, dateKey);
        const workout = workouts.find(w => w.id === workoutId);

        if (!workout || !workout.timerRunning) {
            clearInterval(timerIntervals[workoutId]);
            delete timerIntervals[workoutId];
            return;
        }

        const newElapsed = (workout.timerElapsed || 0) + 1;
        const totalSeconds = workout.timerMinutes * 60;

        if (newElapsed >= totalSeconds) {
            // Timer completed
            updateWorkout(data, dateKey, workoutId, {
                timerElapsed: totalSeconds,
                timerRunning: false,
                timerCompleted: true
            });
            clearInterval(timerIntervals[workoutId]);
            delete timerIntervals[workoutId];
        } else {
            updateWorkout(data, dateKey, workoutId, {
                timerElapsed: newElapsed
            });
        }
        render();
    }, 1000);
}

// Stop a timer for a workout
function stopTimer(workoutId) {
    if (timerIntervals[workoutId]) {
        clearInterval(timerIntervals[workoutId]);
        delete timerIntervals[workoutId];
    }
}

// Initialize the application
function init() {
    render();

    // Restart any running timers on page load
    const workouts = getWorkoutsForDate(data, selectedDateKey);
    workouts.forEach(workout => {
        if (workout.timerRunning && !workout.timerCompleted) {
            startTimer(selectedDateKey, workout.id);
        }
    });

    // Week navigation
    document.getElementById('prev-week')?.addEventListener('click', () => {
        currentWeekOffset--;
        const weekDates = getCurrentWeekDates();
        selectedDateKey = formatDateKey(weekDates[0]);
        render();
    });

    document.getElementById('next-week')?.addEventListener('click', () => {
        currentWeekOffset++;
        const weekDates = getCurrentWeekDates();
        selectedDateKey = formatDateKey(weekDates[0]);
        render();
    });

    // Add workout
    document.getElementById('add-workout-btn')?.addEventListener('click', () => {
        addWorkout(data, selectedDateKey);
        render();
        // Focus the new workout name input
        setTimeout(() => {
            const inputs = document.querySelectorAll('.workout-name-input');
            if (inputs.length > 0) {
                inputs[inputs.length - 1].focus();
            }
        }, 50);
    });

    // Event delegation for dynamic elements
    document.addEventListener('click', (e) => {
        // Day tab click
        if (e.target.classList.contains('day-tab')) {
            selectedDateKey = e.target.dataset.date;

            // Restart timers for new day
            const workouts = getWorkoutsForDate(data, selectedDateKey);
            workouts.forEach(workout => {
                if (workout.timerRunning && !workout.timerCompleted) {
                    startTimer(selectedDateKey, workout.id);
                }
            });

            render();
        }

        // Set box click
        if (e.target.classList.contains('set-box')) {
            const workoutId = e.target.dataset.workoutId;
            const dateKey = e.target.dataset.date;
            const setIndex = parseInt(e.target.dataset.set);
            toggleSet(data, dateKey, workoutId, setIndex);
            render();
        }

        // Delete workout
        if (e.target.classList.contains('workout-delete')) {
            const workoutId = e.target.dataset.workoutId;
            const dateKey = e.target.dataset.date;
            stopTimer(workoutId);
            deleteWorkout(data, dateKey, workoutId);
            render();
        }

        // Type toggle
        if (e.target.classList.contains('type-toggle')) {
            const workoutId = e.target.dataset.workoutId;
            const dateKey = e.target.dataset.date;
            const type = e.target.dataset.type;
            stopTimer(workoutId);
            updateWorkout(data, dateKey, workoutId, {
                type,
                completedSets: [],
                timerCompleted: false,
                timerRunning: false,
                timerElapsed: 0
            });
            render();
        }

        // Sets control buttons
        if (e.target.classList.contains('sets-btn')) {
            const workoutId = e.target.dataset.workoutId;
            const dateKey = e.target.dataset.date;
            const action = e.target.dataset.action;

            const workouts = getWorkoutsForDate(data, dateKey);
            const workout = workouts.find(w => w.id === workoutId);
            if (workout) {
                let newSets = workout.sets;
                if (action === 'increase' && newSets < 10) {
                    newSets++;
                } else if (action === 'decrease' && newSets > 1) {
                    newSets--;
                }
                // Remove completed sets that are now out of range
                const completedSets = workout.completedSets.filter(s => s < newSets);
                updateWorkout(data, dateKey, workoutId, { sets: newSets, completedSets });
                render();
            }
        }

        // Timer minutes control buttons
        if (e.target.classList.contains('timer-btn')) {
            const workoutId = e.target.dataset.workoutId;
            const dateKey = e.target.dataset.date;
            const action = e.target.dataset.action;

            const workouts = getWorkoutsForDate(data, dateKey);
            const workout = workouts.find(w => w.id === workoutId);
            if (workout && !workout.timerRunning) {
                let newMinutes = workout.timerMinutes;
                if (action === 'increase' && newMinutes < 60) {
                    newMinutes++;
                } else if (action === 'decrease' && newMinutes > 1) {
                    newMinutes--;
                }
                updateWorkout(data, dateKey, workoutId, {
                    timerMinutes: newMinutes,
                    timerElapsed: 0,
                    timerCompleted: false
                });
                render();
            }
        }

        // Timer play/pause
        if (e.target.classList.contains('timer-play')) {
            const workoutId = e.target.dataset.workoutId;
            const dateKey = e.target.dataset.date;

            const workouts = getWorkoutsForDate(data, dateKey);
            const workout = workouts.find(w => w.id === workoutId);
            if (workout) {
                if (workout.timerCompleted) {
                    // Reset timer if completed
                    updateWorkout(data, dateKey, workoutId, {
                        timerElapsed: 0,
                        timerCompleted: false,
                        timerRunning: false
                    });
                } else if (workout.timerRunning) {
                    // Pause timer
                    stopTimer(workoutId);
                    updateWorkout(data, dateKey, workoutId, {
                        timerRunning: false
                    });
                } else {
                    // Start timer
                    updateWorkout(data, dateKey, workoutId, {
                        timerRunning: true
                    });
                    startTimer(dateKey, workoutId);
                }
                render();
            }
        }
    });

    // Input change handlers
    document.addEventListener('input', (e) => {
        // Workout name change
        if (e.target.classList.contains('workout-name-input')) {
            const workoutId = e.target.dataset.workoutId;
            const dateKey = e.target.dataset.date;
            updateWorkout(data, dateKey, workoutId, { name: e.target.value });
        }
    });
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
