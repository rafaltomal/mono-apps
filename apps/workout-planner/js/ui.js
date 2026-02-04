// UI module for Workout Tracker
// Handles DOM rendering

import {
    formatDateKey,
    isToday,
    getDayName
} from './storage.js';

// Render day tabs
export function renderDayTabs(weekDates, selectedDateKey) {
    const container = document.getElementById('day-tabs');
    if (!container) return;

    const html = weekDates.map(date => {
        const dateKey = formatDateKey(date);
        const isTodayDate = isToday(date);
        const isSelected = dateKey === selectedDateKey;

        const classes = ['day-tab'];
        if (isSelected) classes.push('active');
        if (isTodayDate) classes.push('today');

        return `
            <button class="${classes.join(' ')}" data-date="${dateKey}">
                ${getDayName(date)}
            </button>
        `;
    }).join('');

    container.innerHTML = html;
}

// Render workouts list
export function renderWorkoutsList(workouts, dateKey) {
    const container = document.getElementById('workouts-list');
    if (!container) return;

    if (workouts.length === 0) {
        container.innerHTML = '<div class="empty-state">No workouts for this day.<br>Click "+ ADD WORKOUT" to get started.</div>';
        return;
    }

    const html = workouts.map(workout => {
        if (workout.type === 'timer') {
            return renderTimerWorkout(workout, dateKey);
        }
        return renderSetsWorkout(workout, dateKey);
    }).join('');

    container.innerHTML = html;
}

// Render sets-based workout
function renderSetsWorkout(workout, dateKey) {
    const setsHtml = [];
    for (let i = 0; i < workout.sets; i++) {
        const isCompleted = workout.completedSets.includes(i);
        setsHtml.push(`
            <div class="set-box ${isCompleted ? 'completed' : ''}"
                 data-workout-id="${workout.id}"
                 data-date="${dateKey}"
                 data-set="${i}">
                ${isCompleted ? '✓' : i + 1}
            </div>
        `);
    }

    return `
        <div class="workout-card" data-workout-id="${workout.id}">
            <div class="workout-header">
                <input type="text"
                       class="workout-name-input"
                       placeholder="Exercise name..."
                       value="${escapeHtml(workout.name)}"
                       data-workout-id="${workout.id}"
                       data-date="${dateKey}">
                <div class="workout-header-controls">
                    <div class="workout-type-row">
                        <button class="type-toggle ${workout.type === 'sets' ? 'active' : ''}"
                                data-workout-id="${workout.id}"
                                data-date="${dateKey}"
                                data-type="sets">Sets</button>
                        <button class="type-toggle ${workout.type === 'timer' ? 'active' : ''}"
                                data-workout-id="${workout.id}"
                                data-date="${dateKey}"
                                data-type="timer">Timer</button>
                    </div>
                    <div class="sets-control">
                        <button class="sets-btn" data-workout-id="${workout.id}" data-date="${dateKey}" data-action="decrease">−</button>
                        <span class="sets-count">${workout.sets}</span>
                        <button class="sets-btn" data-workout-id="${workout.id}" data-date="${dateKey}" data-action="increase">+</button>
                    </div>
                </div>
                <button class="workout-delete" data-workout-id="${workout.id}" data-date="${dateKey}">×</button>
            </div>
            <div class="workout-sets">
                ${setsHtml.join('')}
            </div>
        </div>
    `;
}

// Render timer-based workout
function renderTimerWorkout(workout, dateKey) {
    const totalSeconds = workout.timerMinutes * 60;
    const elapsed = workout.timerElapsed || 0;
    const progress = workout.timerCompleted ? 100 : (elapsed / totalSeconds) * 100;
    const displayTime = formatTimeDisplay(elapsed, totalSeconds);

    return `
        <div class="workout-card" data-workout-id="${workout.id}">
            <div class="workout-header">
                <input type="text"
                       class="workout-name-input"
                       placeholder="Exercise name..."
                       value="${escapeHtml(workout.name)}"
                       data-workout-id="${workout.id}"
                       data-date="${dateKey}">
                <div class="workout-header-controls">
                    <div class="workout-type-row">
                        <button class="type-toggle ${workout.type === 'sets' ? 'active' : ''}"
                                data-workout-id="${workout.id}"
                                data-date="${dateKey}"
                                data-type="sets">Sets</button>
                        <button class="type-toggle ${workout.type === 'timer' ? 'active' : ''}"
                                data-workout-id="${workout.id}"
                                data-date="${dateKey}"
                                data-type="timer">Timer</button>
                    </div>
                    <div class="sets-control">
                        <button class="timer-btn" data-workout-id="${workout.id}" data-date="${dateKey}" data-action="decrease">−</button>
                        <span class="sets-count">${workout.timerMinutes} min</span>
                        <button class="timer-btn" data-workout-id="${workout.id}" data-date="${dateKey}" data-action="increase">+</button>
                    </div>
                </div>
                <button class="workout-delete" data-workout-id="${workout.id}" data-date="${dateKey}">×</button>
            </div>
            <div class="workout-timer">
                <button class="timer-play ${workout.timerRunning ? 'running' : ''} ${workout.timerCompleted ? 'completed' : ''}"
                        data-workout-id="${workout.id}"
                        data-date="${dateKey}">
                    ${workout.timerCompleted ? '✓' : (workout.timerRunning ? '⏸' : '▶')}
                </button>
                <div class="timer-bar ${workout.timerCompleted ? 'completed' : ''}"
                     data-workout-id="${workout.id}">
                    <div class="timer-bar-fill" style="width: ${progress}%"></div>
                    <span class="timer-bar-text">${displayTime}</span>
                </div>
            </div>
        </div>
    `;
}

// Format elapsed time as M:SS / total
function formatTimeDisplay(elapsed, total) {
    const elapsedMins = Math.floor(elapsed / 60);
    const elapsedSecs = elapsed % 60;
    const totalMins = Math.floor(total / 60);
    return `${elapsedMins}:${String(elapsedSecs).padStart(2, '0')} / ${totalMins} min`;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update week title
export function updateWeekTitle(title) {
    const el = document.getElementById('week-title');
    if (el) {
        el.textContent = title;
    }
}
