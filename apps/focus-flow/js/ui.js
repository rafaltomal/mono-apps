// UI module for Focus Flow
// Handles DOM manipulation and rendering

import {
    formatDate,
    getProgress,
    getTasksForDate,
    parseLocalDate
} from './calendar.js';

// Encouraging messages for celebrations
const CELEBRATION_MESSAGES = [
    "Great work!",
    "One step closer!",
    "You're on fire!",
    "Keep it up!",
    "Fantastic!",
    "Well done!",
    "Progress!",
    "Crushing it!",
    "Nice one!",
    "Brilliant!"
];

// Get a random celebration message
function getRandomMessage() {
    const index = Math.floor(Math.random() * CELEBRATION_MESSAGES.length);
    return CELEBRATION_MESSAGES[index];
}

// Show a specific screen
export function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId)?.classList.add('active');
}

// Render the timeline calendar
export function renderTimeline(tasks, settings, selectedDate, onDayClick) {
    const timeline = document.getElementById('timeline');
    if (!timeline) return;

    // Get all unique dates from tasks
    const taskDates = new Set(tasks.map(t => t.assignedDate));

    // Get date range using parseLocalDate to avoid timezone issues
    const startDate = parseLocalDate(settings.startDate);
    const lastTaskDate = tasks.reduce((max, t) => {
        const d = parseLocalDate(t.assignedDate);
        return d > max ? d : max;
    }, startDate);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let html = '';
    let currentDate = new Date(startDate);
    let lastMonth = -1;

    while (currentDate <= lastTaskDate) {
        const dateStr = formatDate(currentDate);
        const hasTask = taskDates.has(dateStr);
        const dayTasks = tasks.filter(t => t.assignedDate === dateStr);
        const isCompleted = dayTasks.length > 0 && dayTasks.every(t => t.completed);
        const isActive = dateStr === selectedDate;
        const showMonth = currentDate.getMonth() !== lastMonth;

        const classes = ['timeline-day'];
        if (!hasTask) classes.push('inactive');
        if (hasTask) classes.push('has-task');
        if (isCompleted) classes.push('completed');
        if (isActive) classes.push('active');

        html += `
            <div class="${classes.join(' ')}" data-date="${dateStr}">
                ${showMonth ? `<div class="timeline-month">${monthNames[currentDate.getMonth()]}</div>` : '<div class="timeline-month"></div>'}
                <div class="timeline-date">${currentDate.getDate()}</div>
                <div class="timeline-weekday">${dayNames[currentDate.getDay()]}</div>
            </div>
        `;

        lastMonth = currentDate.getMonth();
        currentDate.setDate(currentDate.getDate() + 1);
    }

    timeline.innerHTML = html;

    // Add click handlers
    timeline.querySelectorAll('.timeline-day:not(.inactive)').forEach(day => {
        day.addEventListener('click', () => {
            const date = day.dataset.date;
            if (onDayClick) onDayClick(date);
        });
    });

    // Scroll to active day
    setTimeout(() => {
        const activeDay = timeline.querySelector('.timeline-day.active');
        if (activeDay) {
            activeDay.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, 100);
}

// Render tasks for selected day
export function renderTasks(tasks, selectedDate, onDone, onMove) {
    const todoList = document.getElementById('todo-list');

    const dayTasks = tasks.filter(t => t.assignedDate === selectedDate);
    const incompleteTasks = dayTasks.filter(t => !t.completed);
    const completedTasks = dayTasks.filter(t => t.completed);

    // Render all tasks - incomplete first, then completed
    const allTasks = [...incompleteTasks, ...completedTasks];

    if (allTasks.length === 0) {
        todoList.innerHTML = '<div class="empty-state">No tasks for this day</div>';
        return;
    }

    todoList.innerHTML = allTasks.map(task => {
        if (task.completed) {
            return `
                <div class="task-item completed-task" data-id="${task.id}">
                    <span class="task-check">✓</span>
                    <span class="task-text">${escapeHtml(task.text)}</span>
                </div>
            `;
        } else {
            return `
                <div class="task-item" data-id="${task.id}">
                    <span class="task-drag-handle">⋮⋮</span>
                    <span class="task-text">${escapeHtml(task.text)}</span>
                    <div class="task-actions">
                        <button class="btn btn-icon task-done" data-id="${task.id}" title="Mark as done">✓</button>
                        <button class="btn btn-icon task-move" data-id="${task.id}" title="Move to next day">→</button>
                    </div>
                </div>
            `;
        }
    }).join('');

    // Add click handlers for incomplete tasks
    todoList.querySelectorAll('.task-done').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            if (onDone) onDone(id);
        });
    });

    todoList.querySelectorAll('.task-move').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            if (onMove) onMove(id);
        });
    });
}

// Update progress footer
export function updateProgress(tasks, stats) {
    const progress = getProgress(tasks);

    document.getElementById('progress-text').textContent =
        `${Math.round(progress.percentage)}%`;
    document.getElementById('progress-fill').style.width =
        `${progress.percentage}%`;
    document.getElementById('streak-text').textContent =
        `${stats.streak} day streak`;
}

// Show celebration animation
export function showCelebration() {
    const celebration = document.getElementById('celebration');
    const message = document.getElementById('celebration-message');

    message.textContent = getRandomMessage();
    celebration.classList.add('active');

    return new Promise(resolve => {
        setTimeout(() => {
            celebration.classList.remove('active');
            resolve();
        }, 1500);
    });
}

// Show modal
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

// Hide modal
export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Get form values from input screen
export function getInputFormValues() {
    const taskText = document.getElementById('task-input').value;
    const startDate = document.getElementById('start-date').value;
    const tasksPerDay = parseInt(document.getElementById('tasks-per-day').value) || 1;

    // Get working days from button states
    const workingDays = [];
    document.querySelectorAll('.day-btn.active').forEach(btn => {
        workingDays.push(parseInt(btn.dataset.day));
    });

    return {
        taskText,
        startDate,
        tasksPerDay,
        workingDays
    };
}

// Set default form values
export function setDefaultFormValues() {
    const today = formatDate(new Date());
    document.getElementById('start-date').value = today;
}

// Populate edit form
export function populateEditForm(taskText) {
    document.getElementById('edit-task-input').value = taskText;
}

// Get edited task text
export function getEditedTaskText() {
    return document.getElementById('edit-task-input').value;
}

// Setup day buttons toggle
export function setupPaceToggle() {
    // Setup day buttons
    const dayButtons = document.querySelectorAll('.day-btn');
    dayButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            btn.classList.toggle('active');
        });
    });
}

// Validate input form
export function validateInputForm(values) {
    const errors = [];

    if (!values.taskText.trim()) {
        errors.push('Please enter at least one task');
    }

    if (!values.startDate) {
        errors.push('Please select a start date');
    }

    if (values.workingDays.length === 0) {
        errors.push('Please select at least one working day');
    }

    return errors;
}

// Show validation errors
export function showErrors(errors) {
    if (errors.length === 0) return;
    alert(errors.join('\n'));
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
