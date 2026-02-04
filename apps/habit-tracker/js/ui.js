// UI module for Habit Tracker
// Handles DOM manipulation and rendering

import {
    formatDateKey,
    formatMonthYear,
    getDatesForMonth,
    isCompletedOnDate,
    isToday
} from './storage.js';

// Render month navigation
export function renderMonthNav(currentDate, callbacks) {
    const container = document.getElementById('month-nav');
    if (!container) return;

    container.innerHTML = `
        <button class="btn btn-icon" id="prev-month">←</button>
        <div class="month-nav-title">
            <h2>${formatMonthYear(currentDate)}</h2>
        </div>
        <button class="btn btn-icon" id="next-month">→</button>
    `;

    document.getElementById('prev-month').addEventListener('click', callbacks.onPrevMonth);
    document.getElementById('next-month').addEventListener('click', callbacks.onNextMonth);
}

// Render the calendar grid with dots
export function renderCalendar(habits, currentDate, selectedDate, callbacks) {
    const container = document.getElementById('calendar-grid');
    if (!container) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dates = getDatesForMonth(year, month);
    const selectedKey = formatDateKey(selectedDate);

    // Weekday headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let headerHtml = '<div class="calendar-header">';
    weekdays.forEach(day => {
        headerHtml += `<div class="calendar-weekday">${day}</div>`;
    });
    headerHtml += '</div>';

    // Get first day of month to know padding
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    // Calendar days
    let daysHtml = '<div class="calendar-days">';

    // Add empty cells for padding
    for (let i = 0; i < firstDayOfMonth; i++) {
        daysHtml += '<div class="calendar-day empty"></div>';
    }

    // Add actual days
    dates.forEach(date => {
        const dateKey = formatDateKey(date);
        const isTodayDate = isToday(date);
        const isSelected = dateKey === selectedKey;

        // Calculate completion status for this day
        const completionStatus = getCompletionStatus(habits, dateKey);

        const dayClasses = ['calendar-day'];
        if (isTodayDate) dayClasses.push('today');
        if (isSelected) dayClasses.push('selected');
        if (completionStatus.allComplete && habits.length > 0) dayClasses.push('all-complete');

        // Build dots HTML
        let dotsHtml = '';
        if (completionStatus.allComplete && habits.length > 0) {
            dotsHtml = '<span class="day-checkmark">✓</span>';
        } else if (habits.length > 0) {
            dotsHtml = '<div class="day-dots">';
            habits.forEach(habit => {
                const isCompleted = isCompletedOnDate(habit, dateKey);
                const dotClass = isCompleted ? 'dot completed' : 'dot';
                dotsHtml += `<span class="${dotClass}"></span>`;
            });
            dotsHtml += '</div>';
        }

        daysHtml += `
            <div class="${dayClasses.join(' ')}" data-date="${dateKey}">
                <span class="day-number">${date.getDate()}</span>
                ${dotsHtml}
            </div>
        `;
    });

    daysHtml += '</div>';

    container.innerHTML = headerHtml + daysHtml;

    // Attach click handlers
    container.querySelectorAll('.calendar-day:not(.empty)').forEach(day => {
        day.addEventListener('click', () => {
            const dateKey = day.dataset.date;
            if (callbacks.onSelectDate) callbacks.onSelectDate(dateKey);
        });
    });
}

// Get completion status for a day
function getCompletionStatus(habits, dateKey) {
    if (habits.length === 0) {
        return { completed: 0, total: 0, allComplete: false };
    }

    let completed = 0;
    habits.forEach(habit => {
        if (isCompletedOnDate(habit, dateKey)) {
            completed++;
        }
    });

    return {
        completed,
        total: habits.length,
        allComplete: completed === habits.length
    };
}

// Render habits list for selected day
export function renderHabitsList(habits, selectedDate, callbacks) {
    const container = document.getElementById('habits-list');
    if (!container) return;

    const dateKey = formatDateKey(selectedDate);
    const isTodayDate = isToday(selectedDate);

    // Format selected date for display
    const dateDisplay = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    });

    let headerHtml = `
        <div class="habits-list-header">
            <h3>${dateDisplay}</h3>
            ${isTodayDate ? '<span class="today-badge">Today</span>' : ''}
        </div>
    `;

    if (habits.length === 0) {
        container.innerHTML = headerHtml + `
            <div class="empty-state">
                <p>No habits yet.</p>
                <p class="text-muted">Add your first habit below.</p>
            </div>
        `;
        return;
    }

    let habitsHtml = '<div class="habits-buttons">';
    habits.forEach(habit => {
        const isCompleted = isCompletedOnDate(habit, dateKey);
        const btnClasses = ['habit-btn'];
        if (isCompleted) btnClasses.push('completed');

        habitsHtml += `
            <button class="${btnClasses.join(' ')}" data-habit-id="${habit.id}" data-date="${dateKey}">
                <span class="habit-btn-checkbox">${isCompleted ? '✓' : ''}</span>
                <span class="habit-btn-name">${escapeHtml(habit.name)}</span>
                <span class="habit-btn-delete" data-habit-id="${habit.id}">×</span>
            </button>
        `;
    });
    habitsHtml += '</div>';

    container.innerHTML = headerHtml + habitsHtml;

    // Attach button handlers
    container.querySelectorAll('.habit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Don't toggle if clicking delete
            if (e.target.classList.contains('habit-btn-delete')) return;
            const habitId = btn.dataset.habitId;
            const date = btn.dataset.date;
            if (callbacks.onToggle) callbacks.onToggle(habitId, date);
        });
    });

    // Attach delete handlers
    container.querySelectorAll('.habit-btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const habitId = btn.dataset.habitId;
            if (callbacks.onDelete) callbacks.onDelete(habitId);
        });
    });
}

// Render add habit form
export function renderAddHabitForm(callbacks) {
    const container = document.getElementById('add-habit-form');
    if (!container) return;

    container.innerHTML = `
        <div class="add-habit-row">
            <input type="text" id="habit-input" placeholder="New habit name...">
            <button class="btn btn-primary" id="add-habit-btn">Add</button>
        </div>
    `;

    const input = document.getElementById('habit-input');
    const btn = document.getElementById('add-habit-btn');

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const name = input.value.trim();
            if (name && callbacks.onAdd) {
                callbacks.onAdd(name);
                input.value = '';
            }
        }
    });

    btn.addEventListener('click', () => {
        const name = input.value.trim();
        if (name && callbacks.onAdd) {
            callbacks.onAdd(name);
            input.value = '';
        }
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
