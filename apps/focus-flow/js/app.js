// Main application module for Focus Flow
// Handles screen navigation, event listeners, and app state

import { saveData, loadData, clearData, hasExistingData } from './storage.js';
import {
    parseTaskList,
    tasksToText,
    generateCalendar,
    redistributeTasks,
    formatDate,
    calculateStreak,
    getNextWorkingDay,
    parseLocalDate
} from './calendar.js';
import {
    showScreen,
    renderTimeline,
    renderTasks,
    updateProgress,
    showModal,
    hideModal,
    getInputFormValues,
    setDefaultFormValues,
    populateEditForm,
    getEditedTaskText,
    setupPaceToggle,
    validateInputForm,
    showErrors
} from './ui.js';

// App state
let selectedDate = null;

// Initialize the app
function init() {
    // Check for existing data
    if (hasExistingData()) {
        // Go to main view if we have data
        navigateToMainView();
    } else {
        // Show input screen
        setDefaultFormValues();
        showScreen('input-screen');
    }

    setupPaceToggle();
    setupEventListeners();
}

// Setup all event listeners
function setupEventListeners() {
    // Task form submission
    document.getElementById('task-form').addEventListener('submit', handleTaskFormSubmit);

    // Main view actions
    document.getElementById('edit-tasks-btn').addEventListener('click', handleEditTasks);
    document.getElementById('start-over-btn').addEventListener('click', handleStartOver);

    // Modal actions
    document.getElementById('close-modal').addEventListener('click', () => hideModal('edit-modal'));
    document.getElementById('cancel-edit').addEventListener('click', () => hideModal('edit-modal'));
    document.getElementById('edit-form').addEventListener('submit', handleEditFormSubmit);
}

// Handle task form submission
function handleTaskFormSubmit(e) {
    e.preventDefault();

    const values = getInputFormValues();
    const errors = validateInputForm(values);

    if (errors.length > 0) {
        showErrors(errors);
        return;
    }

    // Parse tasks
    const tasks = parseTaskList(values.taskText);

    if (tasks.length === 0) {
        showErrors(['No valid tasks found. Make sure each task starts with - or *']);
        return;
    }

    // Create settings
    const settings = {
        startDate: values.startDate,
        tasksPerDay: values.tasksPerDay,
        workingDays: values.workingDays
    };

    // Generate calendar
    const assignedTasks = generateCalendar(tasks, settings);

    // Save data
    const data = {
        tasks: assignedTasks,
        settings: settings,
        stats: {
            streak: 0,
            lastCompletedDate: null
        }
    };

    saveData(data);

    // Navigate to main view
    navigateToMainView();
}

// Navigate to main view
function navigateToMainView() {
    const data = loadData();

    // Update streak calculation
    const streak = calculateStreak(data.tasks, data.stats.lastCompletedDate, data.settings.workingDays);
    data.stats.streak = streak;
    saveData(data);

    // Find today or first day with incomplete tasks
    const today = formatDate(new Date());
    const todayTasks = data.tasks.filter(t => t.assignedDate === today);

    if (todayTasks.length > 0) {
        selectedDate = today;
    } else {
        // Find first day with incomplete tasks
        const incompleteDates = data.tasks
            .filter(t => !t.completed)
            .map(t => t.assignedDate)
            .sort();
        selectedDate = incompleteDates[0] || data.tasks[0]?.assignedDate || today;
    }

    renderMainView();
    showScreen('main-screen');
}

// Render the main view
function renderMainView() {
    const data = loadData();

    renderTimeline(data.tasks, data.settings, selectedDate, handleDayClick);
    renderTasks(data.tasks, selectedDate, handleTaskDone, handleMoveTask);
    updateProgress(data.tasks, data.stats);
}

// Handle day click in timeline
function handleDayClick(date) {
    selectedDate = date;
    renderMainView();
}

// Handle task completion
function handleTaskDone(taskId) {
    const data = loadData();

    // Mark task as completed
    const taskIndex = data.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        data.tasks[taskIndex].completed = true;
    }

    // Update stats
    data.stats.lastCompletedDate = formatDate(new Date());
    data.stats.streak = calculateStreak(data.tasks, data.stats.lastCompletedDate, data.settings.workingDays);

    saveData(data);
    renderMainView();
}

// Handle move to next day
function handleMoveTask(taskId) {
    const data = loadData();

    // Find the task
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Get next working day using parseLocalDate to avoid timezone issues
    const currentDate = parseLocalDate(task.assignedDate);
    const nextDay = getNextWorkingDay(currentDate, data.settings.workingDays);
    const nextDayStr = formatDate(nextDay);

    // Move this task to next working day
    task.assignedDate = nextDayStr;

    saveData(data);
    renderMainView();
}

// Handle edit tasks
function handleEditTasks() {
    const data = loadData();
    const taskText = tasksToText(data.tasks);
    populateEditForm(taskText);
    showModal('edit-modal');
}

// Handle edit form submission
function handleEditFormSubmit(e) {
    e.preventDefault();

    const data = loadData();
    const newTaskText = getEditedTaskText();
    const newTasks = parseTaskList(newTaskText);

    if (newTasks.length === 0) {
        showErrors(['No valid tasks found. Make sure each task starts with - or *']);
        return;
    }

    // Preserve completed status for existing tasks by text match
    const completedTexts = new Set(
        data.tasks.filter(t => t.completed).map(t => t.text)
    );

    newTasks.forEach(task => {
        if (completedTexts.has(task.text)) {
            task.completed = true;
        }
    });

    // Regenerate calendar
    const assignedTasks = generateCalendar(newTasks, data.settings);
    data.tasks = assignedTasks;
    saveData(data);

    hideModal('edit-modal');
    renderMainView();
}

// Handle start over
function handleStartOver() {
    if (confirm('Are you sure you want to start over? All tasks and progress will be lost.')) {
        clearData();
        setDefaultFormValues();
        document.getElementById('task-input').value = '';
        showScreen('input-screen');
    }
}

// Start the app
init();
