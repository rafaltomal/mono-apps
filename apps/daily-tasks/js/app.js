// Main application module for Daily Tasks
// Handles state management, timer logic, and event coordination

import {
    loadTasks,
    saveTasks,
    formatDateKey,
    getTasksForDate,
    saveTasksForDate,
    createTask
} from './storage.js';

import {
    renderDayNav,
    renderTasks,
    updateTimerDisplay,
    updatePageTitle
} from './ui.js';

// App state
let currentDate = new Date();
let allTasks = {};
let activeTaskId = null;
let timerInterval = null;

// Initialize the app
function init() {
    // Load data from storage
    allTasks = loadTasks();

    // Initial render
    render();

    // Setup event listeners
    setupEventListeners();

    // Start timer update loop
    startTimerLoop();
}

// Main render function
function render() {
    const dateKey = formatDateKey(currentDate);
    const tasks = getTasksForDate(dateKey, allTasks);

    // Find active task (might be on different date)
    const activeTask = findActiveTask();

    // Render day navigator
    renderDayNav(currentDate, allTasks, handleDateClick);

    // Render task lists
    renderTasks(tasks, activeTaskId, {
        onToggleTimer: handleToggleTimer,
        onComplete: handleComplete,
        onMoveToTomorrow: handleMoveToTomorrow,
        onDelete: handleDelete,
        onReorder: handleReorder
    });

    // Update page title
    updatePageTitle(activeTask);
}

// Find the active task across all dates
function findActiveTask() {
    for (const dateKey in allTasks) {
        const task = allTasks[dateKey].find(t => t.id === activeTaskId);
        if (task) return task;
    }
    return null;
}

// Setup global event listeners
function setupEventListeners() {
    // Task input form
    const input = document.getElementById('task-input');
    const addBtn = document.getElementById('add-task-btn');

    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleAddTask();
            }
        });
    }

    if (addBtn) {
        addBtn.addEventListener('click', handleAddTask);
    }
}

// Start the timer update loop
function startTimerLoop() {
    timerInterval = setInterval(() => {
        if (activeTaskId) {
            const activeTask = findActiveTask();
            if (activeTask && activeTask.startTime) {
                updateTimerDisplay(activeTaskId, activeTask.timeSpent, activeTask.startTime);
                updatePageTitle(activeTask);
            }
        }
    }, 1000);
}

// Handle date selection
function handleDateClick(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    currentDate = new Date(year, month - 1, day);
    render();
}

// Handle adding a new task
function handleAddTask() {
    const input = document.getElementById('task-input');
    const text = input?.value.trim();

    if (!text) return;

    const dateKey = formatDateKey(currentDate);
    const tasks = getTasksForDate(dateKey, allTasks);
    const newTask = createTask(text);

    tasks.push(newTask);
    allTasks = saveTasksForDate(dateKey, tasks, allTasks);

    input.value = '';
    render();
}

// Handle toggle timer (play/pause)
function handleToggleTimer(taskId) {
    const dateKey = formatDateKey(currentDate);
    const tasks = getTasksForDate(dateKey, allTasks);
    const task = tasks.find(t => t.id === taskId);

    if (!task) return;

    if (activeTaskId === taskId) {
        // Pause the timer
        if (task.startTime) {
            const elapsed = Math.floor((Date.now() - task.startTime) / 1000);
            task.timeSpent += elapsed;
        }
        task.isActive = false;
        task.startTime = null;
        activeTaskId = null;
    } else {
        // Stop any other active timer first
        if (activeTaskId) {
            stopActiveTimer();
        }

        // Start this timer
        task.isActive = true;
        task.startTime = Date.now();
        activeTaskId = taskId;
    }

    allTasks = saveTasksForDate(dateKey, tasks, allTasks);
    render();
}

// Stop the currently active timer
function stopActiveTimer() {
    if (!activeTaskId) return;

    // Find the active task across all dates
    for (const dateKey in allTasks) {
        const tasks = allTasks[dateKey];
        const task = tasks.find(t => t.id === activeTaskId);
        if (task) {
            if (task.startTime) {
                const elapsed = Math.floor((Date.now() - task.startTime) / 1000);
                task.timeSpent += elapsed;
            }
            task.isActive = false;
            task.startTime = null;
            saveTasks(allTasks);
            break;
        }
    }

    activeTaskId = null;
}

// Handle completing a task
function handleComplete(taskId) {
    const dateKey = formatDateKey(currentDate);
    const tasks = getTasksForDate(dateKey, allTasks);
    const task = tasks.find(t => t.id === taskId);

    if (!task) return;

    // Stop timer if this task was active
    if (activeTaskId === taskId) {
        if (task.startTime) {
            const elapsed = Math.floor((Date.now() - task.startTime) / 1000);
            task.timeSpent += elapsed;
        }
        task.startTime = null;
        task.isActive = false;
        activeTaskId = null;
    }

    task.completed = true;
    allTasks = saveTasksForDate(dateKey, tasks, allTasks);
    render();
}

// Handle moving task to tomorrow
function handleMoveToTomorrow(taskId) {
    const dateKey = formatDateKey(currentDate);
    const tasks = getTasksForDate(dateKey, allTasks);
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) return;

    const task = tasks[taskIndex];

    // Stop timer if active
    if (activeTaskId === taskId) {
        if (task.startTime) {
            const elapsed = Math.floor((Date.now() - task.startTime) / 1000);
            task.timeSpent += elapsed;
        }
        task.startTime = null;
        task.isActive = false;
        activeTaskId = null;
    }

    // Remove from current date
    tasks.splice(taskIndex, 1);
    allTasks = saveTasksForDate(dateKey, tasks, allTasks);

    // Add to tomorrow
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = formatDateKey(tomorrow);
    const tomorrowTasks = getTasksForDate(tomorrowKey, allTasks);

    // Reset timer state but keep timeSpent
    task.isActive = false;
    task.startTime = null;

    tomorrowTasks.push(task);
    allTasks = saveTasksForDate(tomorrowKey, tomorrowTasks, allTasks);

    render();
}

// Handle deleting a task
function handleDelete(taskId) {
    const dateKey = formatDateKey(currentDate);
    const tasks = getTasksForDate(dateKey, allTasks);
    const filteredTasks = tasks.filter(t => t.id !== taskId);

    // Stop timer if this task was active
    if (activeTaskId === taskId) {
        activeTaskId = null;
    }

    allTasks = saveTasksForDate(dateKey, filteredTasks, allTasks);
    render();
}

// Handle reordering tasks (drag and drop)
function handleReorder(newOrder) {
    const dateKey = formatDateKey(currentDate);
    const tasks = getTasksForDate(dateKey, allTasks);

    // Separate completed and incomplete
    const doneTasks = tasks.filter(t => t.completed);
    const todoTasks = tasks.filter(t => !t.completed);

    // Reorder todo tasks based on new order
    const reorderedTodo = newOrder
        .map(id => todoTasks.find(t => t.id === id))
        .filter(Boolean);

    // Combine: reordered todos + done tasks
    const reorderedTasks = [...reorderedTodo, ...doneTasks];

    allTasks = saveTasksForDate(dateKey, reorderedTasks, allTasks);
    // Don't re-render to avoid flickering during drag
}

// Start the app
init();
