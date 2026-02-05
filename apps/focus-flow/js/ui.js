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
export function renderTasks(tasks, selectedDate, callbacks) {
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
                    <div class="task-actions">
                        <button class="btn btn-icon task-delete" data-id="${task.id}" title="Delete task">×</button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="task-item" data-id="${task.id}" draggable="true">
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
            if (callbacks.onDone) callbacks.onDone(id);
        });
    });

    todoList.querySelectorAll('.task-move').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            if (callbacks.onMove) callbacks.onMove(id);
        });
    });

    // Add click handlers for delete buttons
    todoList.querySelectorAll('.task-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            if (callbacks.onDelete) callbacks.onDelete(id);
        });
    });

    // Setup drag and drop for reordering (desktop + mobile)
    if (callbacks.onReorder) {
        setupDragAndDrop(todoList, incompleteTasks, callbacks.onReorder);
    }
}

// Setup drag and drop with touch support
function setupDragAndDrop(container, tasks, onReorder) {
    let draggedItem = null;
    let draggedId = null;
    let placeholder = null;
    let touchStartY = 0;
    let initialTop = 0;

    // Get only incomplete task items (not completed ones)
    const getTaskItems = () => container.querySelectorAll('.task-item:not(.completed-task)');

    // --- Desktop drag events ---
    container.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.task-item:not(.completed-task)');
        if (!item) return;

        draggedItem = item;
        draggedId = item.dataset.id;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    container.addEventListener('dragend', (e) => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            saveNewOrder();
            draggedItem = null;
            draggedId = null;
        }
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (!draggedItem) return;

        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement) {
            container.insertBefore(draggedItem, afterElement);
        } else {
            // Insert before completed tasks section
            const firstCompleted = container.querySelector('.completed-task');
            if (firstCompleted) {
                container.insertBefore(draggedItem, firstCompleted);
            } else {
                container.appendChild(draggedItem);
            }
        }
    });

    // --- Mobile touch events ---
    container.addEventListener('touchstart', (e) => {
        const handle = e.target.closest('.task-drag-handle');
        if (!handle) return;

        const item = handle.closest('.task-item:not(.completed-task)');
        if (!item) return;

        e.preventDefault();

        draggedItem = item;
        draggedId = item.dataset.id;
        touchStartY = e.touches[0].clientY;
        initialTop = item.getBoundingClientRect().top;

        item.classList.add('dragging');

        // Create placeholder
        placeholder = document.createElement('div');
        placeholder.className = 'task-placeholder';
        placeholder.style.height = item.offsetHeight + 'px';
        item.parentNode.insertBefore(placeholder, item.nextSibling);

        // Make item float
        item.style.position = 'fixed';
        item.style.left = '0';
        item.style.right = '0';
        item.style.top = initialTop + 'px';
        item.style.zIndex = '1000';
        item.style.width = item.offsetWidth + 'px';
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
        if (!draggedItem) return;
        e.preventDefault();

        const touchY = e.touches[0].clientY;
        const deltaY = touchY - touchStartY;

        // Move the dragged item
        draggedItem.style.top = (initialTop + deltaY) + 'px';

        // Find where to insert placeholder
        const afterElement = getDragAfterElement(container, touchY);
        if (afterElement && afterElement !== placeholder) {
            container.insertBefore(placeholder, afterElement);
        } else if (!afterElement) {
            const firstCompleted = container.querySelector('.completed-task');
            if (firstCompleted && placeholder.nextSibling !== firstCompleted) {
                container.insertBefore(placeholder, firstCompleted);
            } else if (!firstCompleted) {
                container.appendChild(placeholder);
            }
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        if (!draggedItem) return;

        // Reset styles
        draggedItem.style.position = '';
        draggedItem.style.left = '';
        draggedItem.style.right = '';
        draggedItem.style.top = '';
        draggedItem.style.zIndex = '';
        draggedItem.style.width = '';
        draggedItem.classList.remove('dragging');

        // Insert at placeholder position
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(draggedItem, placeholder);
            placeholder.remove();
        }

        saveNewOrder();

        draggedItem = null;
        draggedId = null;
        placeholder = null;
    });

    // Helper: get element after which to insert
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-item:not(.completed-task):not(.dragging)')];

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

    // Helper: save new order
    function saveNewOrder() {
        const items = container.querySelectorAll('.task-item:not(.completed-task)');
        const newOrder = Array.from(items).map(item => parseInt(item.dataset.id));
        onReorder(newOrder);
    }
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

// Setup day buttons toggle and stepper controls
export function setupPaceToggle() {
    // Setup day buttons
    const dayButtons = document.querySelectorAll('.day-btn');
    dayButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            btn.classList.toggle('active');
        });
    });

    // Setup tasks per day stepper
    const tasksInput = document.getElementById('tasks-per-day');
    const minusBtn = document.getElementById('tasks-per-day-minus');
    const plusBtn = document.getElementById('tasks-per-day-plus');

    if (tasksInput && minusBtn && plusBtn) {
        minusBtn.addEventListener('click', () => {
            const currentValue = parseInt(tasksInput.value) || 1;
            const min = parseInt(tasksInput.min) || 1;
            if (currentValue > min) {
                tasksInput.value = currentValue - 1;
            }
        });

        plusBtn.addEventListener('click', () => {
            const currentValue = parseInt(tasksInput.value) || 1;
            const max = parseInt(tasksInput.max) || 99;
            if (currentValue < max) {
                tasksInput.value = currentValue + 1;
            }
        });
    }
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
