const { useState, useEffect, useMemo, useRef } = React;

const QUOTES = [
  'Start where you are. Use what you have. Do what you can.',
  'The secret of getting ahead is getting started.',
  'Success is the sum of small efforts repeated day in and day out.',
  'Set your goals high, and don\'t stop till you get there.',
  'Your future is created by what you do today, not tomorrow.'
];

// Performance monitoring & testing utilities
const AppDebug = {
  testResults: [],

  log(test, result, details = '') {
    const entry = { test, result, timestamp: new Date().toLocaleTimeString(), details };
    this.testResults.push(entry);
    console.log(`[${result ? '✓' : '✗'}] ${test}`, details);
  },

  runTests() {
    console.clear();
    console.log('=== APP VALIDATION TEST SUITE ===\n');
    this.testResults = [];

    // Test 1: LocalStorage availability
    try {
      localStorage.setItem('test', 'ok');
      localStorage.removeItem('test');
      this.log('LocalStorage', true);
    } catch (e) {
      this.log('LocalStorage', false, e.message);
    }

    // Test 2: React environment
    try {
      this.log('React loaded', typeof React !== 'undefined');
    } catch (e) {
      this.log('React loaded', false);
    }

    // Test 3: Chart.js
    try {
      this.log('Chart.js loaded', typeof Chart !== 'undefined');
    } catch (e) {
      this.log('Chart.js loaded', false);
    }

    console.log('\n=== RESULTS ===');
    const passed = this.testResults.filter(r => r.result).length;
    const total = this.testResults.length;
    console.log(`Passed: ${passed}/${total}`);
    return { passed, total, results: this.testResults };
  }
};

// Run tests on load
if (typeof window !== 'undefined') {
  window.runAppTests = () => AppDebug.runTests();
}

function getWeeklyStats(tasks) {
  const lastSevenDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  let activeDays = 0;
  let totalCompletion = 0;
  let bestDay = '-';
  let bestCount = 0;
  let worstDay = '-';
  let worstCount = Infinity;

  lastSevenDays.forEach((day) => {
    const dayTasks = tasks.filter((t) => {
      const created = new Date(t.createdAt).toISOString().split('T')[0];
      return created === day;
    });
    if (dayTasks.length > 0) {
      activeDays++;
      const completed = dayTasks.filter((t) => t.completed).length;
      totalCompletion += (completed / dayTasks.length) * 100;
      if (completed > bestCount) {
        bestCount = completed;
        bestDay = new Date(day).toLocaleDateString('en-US', { weekday: 'short' });
      }
      if (completed < worstCount) {
        worstCount = completed;
        worstDay = new Date(day).toLocaleDateString('en-US', { weekday: 'short' });
      }
    }
  });

  return {
    activeDays,
    avgCompletion: activeDays > 0 ? Math.round(totalCompletion / activeDays) : 0,
    bestDay,
    worstDay
  };
}

function getWeeklyChartData(tasks) {
  const dayLabels = [];
  const completedData = [];
  const pendingData = [];
  const percentageData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayKey = d.toISOString().split('T')[0];
    dayLabels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));

    const createdToday = tasks.filter((t) => t.createdAt.slice(0, 10) === dayKey);
    const completedToday = tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) === dayKey);

    const completedCount = completedToday.length;
    const pendingCount = Math.max(0, createdToday.length - completedCount);
    const total = createdToday.length;
    const percent = total ? Math.round((completedCount / total) * 100) : 0;

    completedData.push(completedCount);
    pendingData.push(pendingCount);
    percentageData.push(percent);
  }

  return { dayLabels, completedData, pendingData, percentageData };
}

function getHeatmapData(tasks) {
  const res = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 29);

  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().split('T')[0];
    const completed = tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) === key).length;
    res.push({
      date: key,
      completed,
      today: d.toDateString() === today.toDateString()
    });
  }

  return res;
}

function getNextId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function formatDuration(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [tasks, setTasks] = useState(() => readStorage('tasks', []));
  const [settings, setSettings] = useState(() => readStorage('appSettings', { theme: 'light', startTime: '09:00', sound: 'on', recipientEmail: '' }));
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [quote, setQuote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [form, setForm] = useState({ name: '', duration: '', priority: 'Medium', category: 'Work', recurring: 'none', startOverride: '', dueDate: '', notes: '' });
  const [editTaskId, setEditTaskId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [notification, setNotification] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(() => readStorage('emailEnabled', false));
  const [carryBannerVisible, setCarryBannerVisible] = useState(false);
  const [carryCount, setCarryCount] = useState(0);
  const [undoTask, setUndoTask] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    document.body.classList.toggle('dark-mode', settings.theme === 'dark');
  }, [settings]);

  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayKey = yesterday.toISOString().split('T')[0];
    const incomplete = tasks.filter((t) => !t.completed && t.createdAt.slice(0, 10) === dayKey).length;
    setCarryCount(incomplete);
    setCarryBannerVisible(incomplete > 0);
  }, [tasks]);

  useEffect(() => {
    const chartEl = chartRef.current;
    if (!chartEl) return;
    const { dayLabels, completedData, pendingData, percentageData } = getWeeklyChartData(tasks);

    // ✅ FIX: Destroy any existing chart on this canvas before creating a new one.
    // Chart.js throws "Canvas is already in use" if we don't clean up first.
    const existingChart = Chart.getChart(chartEl);
    if (existingChart) existingChart.destroy();

    const weekChart = new Chart(chartEl, {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [
          { label: 'Completed', data: completedData, backgroundColor: '#10b981', stack: 'a' },
          { label: 'Pending', data: pendingData, backgroundColor: '#3b82f6', stack: 'a' },
          { label: 'Completion %', data: percentageData, type: 'line', borderColor: '#f59e0b', backgroundColor: '#f59e0b', yAxisID: 'y1', tension: 0.35 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Tasks' }
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            max: 100,
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Completion %' }
          }
        }
      }
    });

    return () => weekChart.destroy();
  }, [tasks]);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!notification) return;
    const tm = setTimeout(() => setNotification(''), 2500);
    return () => clearTimeout(tm);
  }, [notification]);

  useEffect(() => {
    const activeTask = tasks.find((t) => t.timerActive && t.timerRemainingSeconds > 0);
    if (!activeTask) return;
    const timer = setInterval(() => {
      setTasks((prev) => prev.map((t) => {
        if (!t.timerActive) return t;
        const remaining = t.timerRemainingSeconds - 1;
        if (remaining <= 0) {
          showNotify(`Time up for \'${t.name}\'`);
          return { ...t, timerActive: false, timerRemainingSeconds: 0 };
        }
        return { ...t, timerRemainingSeconds: remaining };
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [tasks]);

  const today = new Date();

  const activeTasks = useMemo(() => {
    const normalized = tasks.map((t) => ({ ...t, dueDate: t.dueDate || '' }));
    let result = normalized;
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((t) =>
        t.name.toLowerCase().includes(query) ||
        (t.notes || '').toLowerCase().includes(query) ||
        (t.category || '').toLowerCase().includes(query)
      );
    }
    if (filter === 'pending') result = result.filter((t) => !t.completed);
    else if (filter === 'done') result = result.filter((t) => t.completed);
    else if (['High', 'Medium', 'Low'].includes(filter)) result = result.filter((t) => t.priority === filter);

    result.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        const da = new Date(a.dueDate);
        const db = new Date(b.dueDate);
        if (da < db) return -1;
        if (da > db) return 1;
      } else if (a.dueDate) return -1;
      else if (b.dueDate) return 1;
      const order = { High: 0, Medium: 1, Low: 2 };
      return (order[a.priority] || 3) - (order[b.priority] || 3);
    });

    return result;
  }, [tasks, filter, search]);

  const weeklyChartData = useMemo(() => getWeeklyChartData(tasks), [tasks]);
  const heatmapData = useMemo(() => getHeatmapData(tasks), [tasks]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const showNotify = (msg) => setNotification(msg);

  const resetForm = () => setForm({ name: '', duration: '', priority: 'Medium', category: 'Work', recurring: 'none', startOverride: '', dueDate: '', notes: '' });

  const addTask = (e) => {
    e.preventDefault();

    // Enhanced validation
    if (!form.name.trim()) {
      showNotify('❌ Task name is required');
      return;
    }
    if (form.name.trim().length < 3) {
      showNotify('❌ Task name must be at least 3 characters');
      return;
    }
    if (!form.duration || Number(form.duration) < 1) {
      showNotify('❌ Duration must be at least 1 minute');
      return;
    }
    if (Number(form.duration) > 1440) {
      showNotify('❌ Duration cannot exceed 24 hours');
      return;
    }

    const durationMinutes = Number(form.duration);
    const newTask = {
      id: getNextId(),
      name: form.name.trim(),
      duration: durationMinutes,
      priority: form.priority,
      category: form.category,
      notes: form.notes.trim(),
      startOverride: form.startOverride || '',
      dueDate: form.dueDate || '',
      recurring: form.recurring,
      completed: false,
      completedAt: null,
      actualDuration: null,
      timerActive: false,
      timerRemainingSeconds: durationMinutes * 60,
      createdAt: new Date().toISOString()
    };

    setTasks((prev) => [...prev, newTask]);
    resetForm();
    showNotify('✅ Task added successfully!');
  };

  const updateTask = (id, updates) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTask = (id) => {
    const target = tasks.find((t) => t.id === id);
    if (target) setUndoTask(target);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showNotify('Task deleted');
  };

  const toggleTaskTimer = (task) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== task.id) return t;
      if (t.timerRemainingSeconds <= 0) return t;
      return { ...t, timerActive: !t.timerActive };
    }));
  };

  const completeTask = (task) => {
    const now = new Date().toISOString();
    const isCompleting = !task.completed;
    const updates = {
      completed: isCompleting,
      completedAt: isCompleting ? now : null
    };
    if (isCompleting && task.timerActive) {
      updates.timerActive = false;
    }
    updateTask(task.id, updates);
    showNotify(isCompleting ? 'Task completed!' : 'Task unmarked');
  };

  const startEdit = (task) => {
    setEditTaskId(task.id);
    setEditForm({ ...task });
  };

  const applyEdit = (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.duration || Number(editForm.duration) < 1) {
      showNotify('Invalid edit values');
      return;
    }
    const durationMinutes = Number(editForm.duration);
    setTasks((prev) => prev.map((t) => {
      if (t.id === editTaskId) {
        const durationChanged = durationMinutes !== t.duration;
        const newRemaining = durationChanged ? durationMinutes * 60 : t.timerRemainingSeconds;
        return { ...t, ...editForm, duration: durationMinutes, timerRemainingSeconds: newRemaining };
      }
      return t;
    }));
    setEditTaskId(null);
    showNotify('Task updated');
  };

  const clearAll = () => {
    if (!window.confirm('Clear all tasks?')) return;
    setTasks([]);
    showNotify('All tasks cleared');
  };

  const carryForward = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayKey = yesterday.toISOString().split('T')[0];
    const incomplete = tasks.filter((t) => !t.completed && t.createdAt.slice(0, 10) === dayKey);
    if (!incomplete.length) {
      setCarryBannerVisible(false);
      return;
    }
    const carriedTasks = incomplete.map((t) => ({
      ...t,
      id: getNextId(),
      createdAt: new Date().toISOString(),
      completed: false,
      completedAt: null,
      timerActive: false,
      timerRemainingSeconds: (t.duration || 0) * 60
    }));
    setTasks((prev) => [...prev, ...carriedTasks]);
    setCarryBannerVisible(false);
    showNotify(`${carriedTasks.length} tasks carried forward`);
  };

  const dismissCarry = () => setCarryBannerVisible(false);

  const undoDelete = () => {
    if (!undoTask) return;
    setTasks((prev) => [undoTask, ...prev]);
    setUndoTask(null);
    showNotify('Delete undone');
  };

  const toggleTheme = () => {
    setSettings((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  };

  const toggleEmail = () => {
    setEmailEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('emailEnabled', JSON.stringify(next));
      showNotify(next ? 'Email notifications enabled' : 'Email notifications disabled');
      return next;
    });
  };

  const sendEmailSummary = async (type = 'Summary') => {
    if (!emailEnabled) {
      showNotify('⚠️ Enable email in settings first');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!settings.recipientEmail || !emailRegex.test(settings.recipientEmail)) {
      showNotify('❌ Set valid email in settings');
      return;
    }

    showNotify('📧 Sending ' + type + '...');

    const completedCount = tasks.filter((t) => t.completed).length;
    const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

    const tasksSummary = tasks.slice(0, 10).map(t =>
      `• ${t.name} (${t.duration}m, ${t.completed ? '✓ Done' : '⏳ Pending'})`
    ).join('\n') + (tasks.length > 10 ? `\n... and ${tasks.length - 10} more` : '');

    // EmailJS credentials
    const serviceID = "service_lzz2ilj";
    const templateID = "template_y8rc93f";
    const userID = "IjtA8YEyMttCOXNBm"; // Also known as Public Key

    const templateParams = {
      report_type: type,
      to_email: settings.recipientEmail,
      completion_rate: completionRate + '%',
      completed_count: completedCount,
      total_count: tasks.length,
      tasks_summary: tasksSummary,
      timestamp: new Date().toLocaleString()
    };

    try {
      // ✅ FIX: emailjs.init() is called in index.html before this script loads.
      // We call send() with 3 args only — no 4th publicKey arg needed in v4.
      await emailjs.send(serviceID, templateID, templateParams);
      showNotify('✅ ' + type + ' sent to ' + settings.recipientEmail);
    } catch (error) {
      console.error('EmailJS send failed:', error);
      const msg = error?.text || error?.message || String(error);
      showNotify('❌ Email failed: ' + msg);
    }
  };

  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const stats = { percentage: tasks.length ? Math.round((completedTasksCount / tasks.length) * 100) : 0 };
  const weeklyStats = getWeeklyStats(tasks);

  return (
    <div className="container">
      {notification && <div className="notification">{notification}</div>}
      {undoTask && (
        <div className="undo-bar">
          <span>Task "{undoTask.name}" deleted.</span>
          <button onClick={undoDelete}>Undo</button>
        </div>
      )}

      <header>
        <div>
          <h1>Daily Task Planner</h1>
          <div className="date">{today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div className="header-right">
          <div className="streak-box">
            <div className="streak-label">Streak</div>
            <div className="streak-count">{stats.percentage >= 80 ? '🔥' : '✨'} {stats.percentage}%</div>
          </div>
          <button className="settings-btn" onClick={() => setIsSettingsOpen(true)}>⚙️</button>
          <button className="theme-toggle" onClick={toggleTheme}>{settings.theme === 'dark' ? '☀️' : '🌙'}</button>
        </div>
      </header>

      <div className={`email-section${emailEnabled ? ' enabled' : ''}`}>
        <div className="email-header">
          <span className="email-status-text">📧 Emails: {emailEnabled ? 'Enabled' : 'Disabled'}</span>
          <button className={`email-toggle-btn${emailEnabled ? ' enabled' : ''}`} onClick={toggleEmail}>{emailEnabled ? 'Disable Emails' : 'Enable Emails'}</button>
        </div>
        <div className={`email-buttons${emailEnabled ? ' show' : ''}`}>
          <button className="email-send-btn" onClick={() => sendEmailSummary('Progress Report')}>📊 Send Progress</button>
          <button className="email-send-btn" onClick={() => sendEmailSummary('EOD Report')}>📋 Send EOD</button>
          <button className="email-send-btn" onClick={() => sendEmailSummary('Weekly Report')}>📈 Send Weekly</button>
        </div>
      </div>

      {carryBannerVisible && carryCount > 0 && (
        <div className="carry-banner">
          <span>📋 You have <strong>{carryCount}</strong> incomplete tasks from yesterday. Carry them forward?</span>
          <div className="carry-banner-btns">
            <button className="carry-yes" onClick={carryForward}>Yes, carry forward</button>
            <button className="carry-no" onClick={dismissCarry}>No thanks</button>
          </div>
        </div>
      )}

      <div className="quote-bar">💬 {quote}</div>

      <div className="progress-section">
        <div className="progress-header">
          <span>Daily Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="weekly-section">
        <h2>📊 Weekly Summary</h2>
        <div className="weekly-stats">
          <div className="stat-card">
            <div className="stat-value">{weeklyStats.activeDays}</div>
            <div className="stat-label">Active Days</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{weeklyStats.avgCompletion}%</div>
            <div className="stat-label">Avg Completion</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{weeklyStats.bestDay}</div>
            <div className="stat-label">Best Day</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{weeklyStats.worstDay}</div>
            <div className="stat-label">Worst Day</div>
          </div>
        </div>
        <div className="chart-container">
          <canvas ref={chartRef} id="weeklyChart"></canvas>
        </div>
      </div>

      <div className="heatmap-section">
        <h2>📅 Monthly Activity</h2>
        <div className="heatmap-grid">
          {heatmapData.map((cell) => {
            let level = '0';
            if (cell.completed >= 5) level = 'perfect';
            else if (cell.completed >= 3) level = 'high';
            else if (cell.completed >= 1) level = 'mid';
            else level = 'low';
            return (
              <div key={cell.date} className={`heatmap-cell ${cell.today ? 'today' : ''}`} data-pct={cell.completed === 0 ? '0' : level}>
                <span className="heatmap-tooltip">{cell.date}: {cell.completed} done</span>
              </div>
            );
          })}
        </div>
        <div className="heatmap-legend">
          Less <span className="heatmap-legend-cell hml-0"></span>
          <span className="heatmap-legend-cell hml-low"></span>
          <span className="heatmap-legend-cell hml-mid"></span>
          <span className="heatmap-legend-cell hml-high"></span>
          <span className="heatmap-legend-cell hml-perfect"></span> More
        </div>
      </div>

      <div className="form-section">
        <h2>Add New Task</h2>
        <form onSubmit={addTask}>
          <div className="form-row full">
            <div className="form-group">
              <label>Task Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input type="number" min="1" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Health">Health</option>
                <option value="Study">Study</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Recurring</label>
              <select value={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.value })}>
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
          <div className="form-row full">
            <div className="form-group">
              <label>Notes</label>
              <textarea className="task-notes-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes"></textarea>
            </div>
          </div>
          <button type="submit" className="submit-btn">Add to Schedule</button>
        </form>
      </div>

      <div className="timeline-section">
        <div className="timeline-header">
          <h2>Today's Schedule</h2>
          <button className="clear-btn" onClick={clearAll}>Clear All</button>
        </div>
        <div className="filter-bar">
          <input className="search-input" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {['all', 'pending', 'done', 'High', 'Medium', 'Low'].map((value) => (
            <button key={value} className={`filter-btn${filter === value ? ' active' : ''}`} onClick={() => setFilter(value)}>
              {value === 'all' ? 'All' : value}
            </button>
          ))}
        </div>
        {activeTasks.length === 0 ? (
          <div className="empty-state">No tasks found</div>
        ) : (
          activeTasks.map((task) => {
            const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < today;
            return (
              <div key={task.id} className={`task-item${task.completed ? ' completed' : ''}${isOverdue ? ' overdue' : ''}`}>
                <input type="checkbox" className="task-checkbox" checked={task.completed} onChange={() => completeTask(task)} />
                <div className="task-content">
                  <div className="task-title">{task.name}</div>
                  <div className="task-meta">
                    <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                    <span className="badge badge-cat">{task.category}</span>
                    {task.dueDate && <span className="badge badge-due">Due {task.dueDate}</span>}
                    <span>⏱️ {task.duration}m</span>
                    {task.notes && <span>📝 {task.notes}</span>}
                  </div>
                  <div className="task-meta" style={{ marginTop: '6px' }}>
                    <span className={`task-timer-display ${task.timerRemainingSeconds === 0 ? 'urgent' : ''}`}>
                      {formatDuration(task.timerRemainingSeconds || task.duration * 60)}
                    </span>
                    <button className={`task-timer-btn${task.timerActive ? ' running' : ''}`} onClick={() => toggleTaskTimer(task)}>
                      {task.timerActive ? 'Pause' : (task.timerRemainingSeconds <= 0 ? 'Done' : 'Start')}
                    </button>
                  </div>
                </div>
                <button className="task-edit" onClick={() => startEdit(task)}>✏️</button>
                <button className="task-delete" onClick={() => deleteTask(task.id)}>✕</button>
              </div>
            );
          })
        )}
      </div>

      {editTaskId && (
        <div className="modal active">
          <div className="modal-content wide">
            <h3>Edit Task</h3>
            <form onSubmit={applyEdit}>
              <div className="form-group"><label>Name</label><input value={editForm?.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
              <div className="form-row">
                <div className="form-group"><label>Duration</label><input type="number" min="1" value={editForm?.duration} onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })} required /></div>
                <div className="form-group"><label>Priority</label><select value={editForm?.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></div>
              </div>
              <div className="modal-buttons"><button className="modal-btn save" type="submit">Save</button><button type="button" className="modal-btn cancel" onClick={() => setEditTaskId(null)}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="modal active">
          <div className="modal-content wide">
            <h3>Settings</h3>
            <div className="settings-group">
              <h4>Theme</h4>
              <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value })}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div className="settings-group">
              <h4>Notifications</h4>
              <select value={settings.sound} onChange={(e) => setSettings({ ...settings, sound: e.target.value })}>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>
            <div className="settings-group">
              <h4>Email</h4>
              <input type="email" placeholder="Email address" value={settings.recipientEmail} onChange={(e) => setSettings({ ...settings, recipientEmail: e.target.value })} />
              <button type="button" className="modal-btn save" style={{ marginTop: '10px', width: '100%' }} onClick={toggleEmail}>{emailEnabled ? 'Disable Email' : 'Enable Email'}</button>
            </div>
            <div className="settings-group">
              <button type="button" className="modal-btn save" style={{ marginTop: '10px', width: '100%' }} onClick={() => sendEmailSummary('Summary')}>📧 Send Summary</button>
            </div>
            <div className="modal-buttons"><button type="button" className="modal-btn save" onClick={() => setIsSettingsOpen(false)}>Save</button><button type="button" className="modal-btn cancel" onClick={() => setIsSettingsOpen(false)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
