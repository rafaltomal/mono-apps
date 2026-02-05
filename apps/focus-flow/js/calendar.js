// Calendar logic module for Focus Flow
// Handles task parsing, calendar generation, and redistribution

// Parse bullet list text into task array
export function parseTaskList(text) {
    const lines = text.split('\n');
    const tasks = [];
    let id = 1;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
            // Remove optional - or * prefix
            const taskText = trimmed.replace(/^[-*]\s*/, '').trim();
            if (taskText) {
                tasks.push({
                    id: id++,
                    text: taskText,
                    completed: false,
                    assignedDate: null
                });
            }
        }
    }

    return tasks;
}

// Convert tasks back to bullet list format
export function tasksToText(tasks) {
    return tasks.map(task => `- ${task.text}`).join('\n');
}

// Check if a date is a working day
export function isWorkingDay(date, workingDays) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    return workingDays.includes(dayOfWeek);
}

// Get all working days between two dates
export function getWorkingDays(startDate, endDate, workingDays) {
    const days = [];
    const current = new Date(startDate.getTime());
    const end = new Date(endDate.getTime());

    while (current <= end) {
        if (isWorkingDay(current, workingDays)) {
            days.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }

    return days;
}

// Calculate end date given start date, task count, and tasks per day
export function calculateEndDate(startDate, taskCount, tasksPerDay, workingDays) {
    const daysNeeded = Math.ceil(taskCount / tasksPerDay);
    let count = 0;
    const current = new Date(startDate);

    while (count < daysNeeded) {
        if (isWorkingDay(current, workingDays)) {
            count++;
            if (count === daysNeeded) {
                return new Date(current);
            }
        }
        current.setDate(current.getDate() + 1);
    }

    return new Date(current);
}

// Calculate tasks per day given start date, end date, and task count
export function calculateTasksPerDay(startDate, endDate, taskCount, workingDays) {
    const days = getWorkingDays(startDate, endDate, workingDays);
    if (days.length === 0) return 1;
    return Math.ceil(taskCount / days.length);
}

// Get the next working day after a given date
export function getNextWorkingDay(date, workingDays) {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);

    while (!isWorkingDay(next, workingDays)) {
        next.setDate(next.getDate() + 1);
    }

    return next;
}

// Parse date string to local date (avoiding timezone issues)
export function parseLocalDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

// Generate calendar - assign tasks to dates
export function generateCalendar(tasks, settings) {
    const { startDate, endDate, tasksPerDay, paceType, workingDays } = settings;

    // Clone tasks to avoid mutation
    const assignedTasks = tasks.map(t => ({ ...t, assignedDate: null }));

    let effectiveTasksPerDay = tasksPerDay || 1;

    if (paceType === 'end-date' && endDate) {
        const days = getWorkingDays(parseLocalDate(startDate), parseLocalDate(endDate), workingDays);
        effectiveTasksPerDay = Math.max(1, Math.ceil(assignedTasks.length / days.length));
    }

    // Use parseLocalDate to avoid timezone issues
    let currentDate = parseLocalDate(startDate);
    let tasksAssignedToday = 0;

    for (const task of assignedTasks) {
        // Find next working day if current isn't
        while (!isWorkingDay(currentDate, workingDays)) {
            currentDate.setDate(currentDate.getDate() + 1);
        }

        task.assignedDate = formatDate(currentDate);
        tasksAssignedToday++;

        if (tasksAssignedToday >= effectiveTasksPerDay) {
            currentDate.setDate(currentDate.getDate() + 1);
            tasksAssignedToday = 0;
        }
    }

    return assignedTasks;
}

// Redistribute tasks after one is moved - this just returns the tasks array
// The actual move is done in app.js before calling this
export function redistributeTasks(tasks, movedTaskId, settings) {
    // No redistribution needed - just return tasks as is
    // Each task keeps its assigned date, moved task already has new date
    return tasks;
}

// Get tasks for a specific date
export function getTasksForDate(tasks, date) {
    const dateStr = formatDate(new Date(date));
    return tasks.filter(t => t.assignedDate === dateStr);
}

// Get today's incomplete tasks
export function getTodaysTasks(tasks) {
    const today = formatDate(new Date());
    return tasks.filter(t => t.assignedDate === today && !t.completed);
}

// Get overall progress
export function getProgress(tasks) {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    return {
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
}

// Format date to YYYY-MM-DD
export function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format date for display
export function formatDisplayDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

// Get day name
export function getDayName(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'long' });
}

// Check if date is today
export function isToday(date) {
    const today = new Date();
    const d = new Date(date);
    return formatDate(today) === formatDate(d);
}

// Check if date is in the past
export function isPast(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < today;
}

// Get calendar month data for rendering
export function getCalendarMonth(year, month, tasks) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay(); // Days before 1st
    const totalDays = lastDay.getDate();

    const days = [];

    // Add empty padding days
    for (let i = 0; i < startPadding; i++) {
        days.push({ empty: true });
    }

    // Add actual days
    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        const dayTasks = tasks.filter(t => t.assignedDate === dateStr);

        days.push({
            empty: false,
            date: date,
            dateStr: dateStr,
            day: day,
            tasks: dayTasks,
            isToday: isToday(date),
            isPast: isPast(date),
            hasTask: dayTasks.length > 0,
            allCompleted: dayTasks.length > 0 && dayTasks.every(t => t.completed)
        });
    }

    return days;
}

// Calculate streak
export function calculateStreak(tasks, lastCompletedDate, workingDays) {
    if (!lastCompletedDate) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastCompleted = new Date(lastCompletedDate);
    lastCompleted.setHours(0, 0, 0, 0);

    // Check if the streak is still valid
    // Streak breaks if there's a working day between last completed and today
    // with incomplete tasks
    let checkDate = new Date(lastCompleted);
    checkDate.setDate(checkDate.getDate() + 1);

    while (checkDate < today) {
        if (isWorkingDay(checkDate, workingDays)) {
            const dayTasks = getTasksForDate(tasks, checkDate);
            // If there were tasks and not all completed, streak breaks
            if (dayTasks.length > 0 && !dayTasks.every(t => t.completed)) {
                return 0;
            }
        }
        checkDate.setDate(checkDate.getDate() + 1);
    }

    // Count consecutive completed working days
    let streak = 0;
    checkDate = new Date(lastCompleted);

    while (true) {
        if (isWorkingDay(checkDate, workingDays)) {
            const dayTasks = getTasksForDate(tasks, checkDate);
            if (dayTasks.length > 0 && dayTasks.every(t => t.completed)) {
                streak++;
            } else if (dayTasks.length > 0) {
                break;
            }
        }
        checkDate.setDate(checkDate.getDate() - 1);

        // Don't go back more than 365 days
        const daysDiff = Math.floor((today - checkDate) / (1000 * 60 * 60 * 24));
        if (daysDiff > 365) break;
    }

    return streak;
}
