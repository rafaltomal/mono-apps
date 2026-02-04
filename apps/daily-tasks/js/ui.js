// UI module for Daily Tasks
// Handles DOM manipulation and rendering

import { formatDateKey, formatTime, getTasksForDate } from './storage.js';

// Format date for display (e.g., "Mon")
function formatWeekday(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Format month for display (e.g., "Jan")
function formatMonth(date) {
    return date.toLocaleDateString('en-US', { month: 'short' });
}

// Check if date is today
function isToday(date) {
    const today = new Date();
    return formatDateKey(date) === formatDateKey(today);
}

// Get date range for day navigator (5 before, current, 5 after = 11 days)
function getDateRange(centerDate) {
    const dates = [];
    for (let i = -5; i <= 5; i++) {
        const d = new Date(centerDate);
        d.setDate(d.getDate() + i);
        dates.push(d);
    }
    return dates;
}

// Get status for a date (has incomplete tasks, all complete, or empty)
function getDateStatus(dateKey, allTasks) {
    const tasks = getTasksForDate(dateKey, allTasks);
    if (tasks.length === 0) return 'empty';

    const incomplete = tasks.filter(t => !t.completed);
    if (incomplete.length === 0) return 'complete';
    return 'incomplete';
}

// Render the day navigator
export function renderDayNav(currentDate, allTasks, onDateClick) {
    const container = document.getElementById('day-nav');
    if (!container) return;

    const dates = getDateRange(currentDate);
    const currentKey = formatDateKey(currentDate);
    let lastMonth = null;

    container.innerHTML = dates.map(date => {
        const dateKey = formatDateKey(date);
        const isSelected = dateKey === currentKey;
        const isTodayDate = isToday(date);
        const status = getDateStatus(dateKey, allTasks);
        const showMonth = date.getMonth() !== lastMonth;
        lastMonth = date.getMonth();

        const classes = ['day-nav-item'];
        if (isSelected) classes.push('selected');
        if (isTodayDate) classes.push('today');

        let statusIcon = '';
        if (status === 'incomplete') {
            statusIcon = '<span class="day-nav-status incomplete">●</span>';
        } else if (status === 'complete') {
            statusIcon = '<span class="day-nav-status complete">✓</span>';
        }

        return `
            <div class="${classes.join(' ')}" data-date="${dateKey}">
                ${statusIcon}
                ${showMonth ? `<div class="day-nav-month">${formatMonth(date)}</div>` : '<div class="day-nav-month"></div>'}
                <div class="day-nav-date">${date.getDate()}</div>
                <div class="day-nav-weekday">${formatWeekday(date)}</div>
            </div>
        `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.day-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const dateKey = item.dataset.date;
            if (onDateClick) onDateClick(dateKey);
        });
    });

    // Scroll to selected date
    setTimeout(() => {
        const selected = container.querySelector('.day-nav-item.selected');
        if (selected) {
            selected.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, 50);
}

// Render task lists (To Do and Done columns)
export function renderTasks(tasks, activeTaskId, callbacks) {
    const todoList = document.getElementById('todo-list');
    const doneList = document.getElementById('done-list');

    if (!todoList || !doneList) return;

    const todoTasks = tasks.filter(t => !t.completed);
    const doneTasks = tasks.filter(t => t.completed);

    // Render To Do tasks
    if (todoTasks.length === 0) {
        todoList.innerHTML = '<div class="task-empty">No tasks yet. Add one below.</div>';
    } else {
        todoList.innerHTML = todoTasks.map(task => renderTaskItem(task, activeTaskId, false)).join('');
    }

    // Render Done tasks
    if (doneTasks.length === 0) {
        doneList.innerHTML = '<div class="task-empty">No completed tasks yet.</div>';
    } else {
        doneList.innerHTML = doneTasks.map(task => renderTaskItem(task, activeTaskId, true)).join('');
    }

    // Attach event listeners
    attachTaskListeners(callbacks, activeTaskId);
}

// Render a single task item
function renderTaskItem(task, activeTaskId, isDone) {
    const isActive = task.id === activeTaskId;
    const isDisabled = activeTaskId && !isActive && !isDone;

    const classes = ['task-item'];
    if (task.completed) classes.push('completed');
    if (isActive) classes.push('active');
    if (isDisabled) classes.push('disabled');

    const timerClass = isActive ? 'task-timer active' : 'task-timer';
    const textClass = task.completed ? 'task-text completed' : 'task-text';

    // Calculate current time (if active, add elapsed since startTime)
    let displayTime = task.timeSpent;
    if (isActive && task.startTime) {
        const elapsed = Math.floor((Date.now() - task.startTime) / 1000);
        displayTime = task.timeSpent + elapsed;
    }

    if (isDone) {
        // Done task - only show delete button
        return `
            <div class="${classes.join(' ')}" data-task-id="${task.id}">
                <div class="task-content">
                    <span class="${textClass}">${escapeHtml(task.text)}</span>
                    <span class="task-timer">${formatTime(displayTime)}</span>
                </div>
                <div class="task-actions">
                    <button class="btn btn-icon task-delete" data-task-id="${task.id}" title="Delete">×</button>
                </div>
            </div>
        `;
    }

    // To Do task - show all controls
    const playIcon = isActive ? '❚❚' : '▶';
    const playClass = isActive ? 'btn btn-play active' : 'btn btn-play';

    return `
        <div class="${classes.join(' ')}" data-task-id="${task.id}" draggable="true">
            <span class="task-drag-handle">⋮⋮</span>
            <div class="task-content">
                <span class="${textClass}">${escapeHtml(task.text)}</span>
                <span class="${timerClass}" data-task-id="${task.id}">${formatTime(displayTime)}</span>
            </div>
            <div class="task-actions">
                <button class="${playClass}" data-task-id="${task.id}" title="${isActive ? 'Pause' : 'Start'}">${playIcon}</button>
                <button class="btn btn-icon task-complete" data-task-id="${task.id}" title="Complete">✓</button>
                <button class="btn btn-icon task-move" data-task-id="${task.id}" title="Move to tomorrow">→</button>
            </div>
        </div>
    `;
}

// Attach event listeners to task items
function attachTaskListeners(callbacks, activeTaskId) {
    // Play/Pause buttons
    document.querySelectorAll('.btn-play').forEach(btn => {
        btn.addEventListener('click', () => {
            const taskId = btn.dataset.taskId;
            if (callbacks.onToggleTimer) callbacks.onToggleTimer(taskId);
        });
    });

    // Complete buttons
    document.querySelectorAll('.task-complete').forEach(btn => {
        btn.addEventListener('click', () => {
            const taskId = btn.dataset.taskId;
            if (callbacks.onComplete) callbacks.onComplete(taskId);
        });
    });

    // Move to tomorrow buttons
    document.querySelectorAll('.task-move').forEach(btn => {
        btn.addEventListener('click', () => {
            const taskId = btn.dataset.taskId;
            if (callbacks.onMoveToTomorrow) callbacks.onMoveToTomorrow(taskId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.task-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const taskId = btn.dataset.taskId;
            if (callbacks.onDelete) callbacks.onDelete(taskId);
        });
    });

    // Drag and drop for todo items
    const todoList = document.getElementById('todo-list');
    if (todoList && callbacks.onReorder) {
        setupDragAndDrop(todoList, callbacks.onReorder);
    }
}

// Setup drag and drop
function setupDragAndDrop(container, onReorder) {
    let draggedItem = null;

    container.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('task-item')) {
            draggedItem = e.target;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        }
    });

    container.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('task-item')) {
            e.target.classList.remove('dragging');
            draggedItem = null;
        }
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const afterElement = getDragAfterElement(container, e.clientY);
        if (draggedItem) {
            if (afterElement) {
                container.insertBefore(draggedItem, afterElement);
            } else {
                container.appendChild(draggedItem);
            }
        }
    });

    container.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedItem) {
            // Get new order of task IDs
            const taskItems = container.querySelectorAll('.task-item');
            const newOrder = Array.from(taskItems).map(item => item.dataset.taskId);
            onReorder(newOrder);
        }
    });
}

// Get element after which to insert dragged item
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Update a single timer display (called every second)
export function updateTimerDisplay(taskId, timeSpent, startTime) {
    const timerEl = document.querySelector(`.task-timer[data-task-id="${taskId}"]`);
    if (timerEl) {
        let displayTime = timeSpent;
        if (startTime) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            displayTime = timeSpent + elapsed;
        }
        timerEl.textContent = formatTime(displayTime);
    }
}

// Update browser tab title
export function updatePageTitle(activeTask) {
    if (activeTask && activeTask.startTime) {
        const elapsed = Math.floor((Date.now() - activeTask.startTime) / 1000);
        const displayTime = activeTask.timeSpent + elapsed;
        document.title = `${formatTime(displayTime)} - Daily Tasks`;
    } else {
        document.title = 'Daily Tasks - Mono Dashboard';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
