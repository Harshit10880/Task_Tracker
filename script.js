const { useState, useEffect, useMemo } = React;

const QUOTES = [
  'Start where you are. Use what you have. Do what you can.',
  'The secret of getting ahead is getting started.',
  'Success is the sum of small efforts repeated day in and day out.',
  'Set your goals high, and don’t stop till you get there.',
  'Your future is created by what you do today, not tomorrow.'
];

function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

function getNextId() {
  return Date.now() + Math.floor(Math.random() * 1000);
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

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    document.body.classList.toggle('dark-mode', settings.theme === 'dark');
  }, [settings]);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const wave = setInterval(() => {
      setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }, 300000);
    return () => clearInterval(wave);
  }, []);

  useEffect(() => {
    if (!notification) return;
    const tm = setTimeout(() => setNotification(''), 2500);
    return () => clearTimeout(tm);
  }, [notification]);

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

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const categorySummary = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!map[t.category]) map[t.category] = 0;
      if (t.completed) map[t.category] += 1;
    });
    return map;
  }, [tasks]);

  const showNotify = (msg) => setNotification(msg);

  const resetForm = () => setForm({ name: '', duration: '', priority: 'Medium', category: 'Work', recurring: 'none', startOverride: '', dueDate: '', notes: '' });

  const addTask = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.duration || Number(form.duration) < 1) {
      showNotify('Please fill task name and duration');
      return;
    }
    if (form.dueDate) {
      const due = new Date(form.dueDate);
      const zero = new Date(); zero.setHours(0,0,0,0);
      if (due < zero) {
        showNotify('Due date cannot be in the past');
        return;
      }
    }
    const newTask = {
      id: getNextId(),
      name: form.name.trim(),
      duration: Number(form.duration),
      priority: form.priority,
      category: form.category,
      notes: form.notes.trim(),
      startOverride: form.startOverride || '',
      dueDate: form.dueDate || '',
      recurring: form.recurring,
      completed: false,
      actualDuration: null,
      createdAt: new Date().toISOString()
    };

    setTasks((prev) => [...prev, newTask]);
    resetForm();
    showNotify('Task added!');
  };

  const updateTask = (id, updates) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showNotify('Task deleted');
  };

  const completeTask = (task) => {
    const actual = window.prompt('Actual duration in minutes', task.actualDuration || task.duration);
    const actualNumber = Number(actual);
    if (actual && !Number.isNaN(actualNumber) && actualNumber > 0) {
      updateTask(task.id, { completed: true, actualDuration: actualNumber });
      showNotify('Task completed!');
    } else {
      updateTask(task.id, { completed: true });
      showNotify('Task marked complete');
    }
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
    setTasks((prev) => prev.map((t) => (t.id === editTaskId ? { ...t, ...editForm, duration: Number(editForm.duration) } : t)));
    setEditTaskId(null);
    showNotify('Task updated');
  };

  const clearAll = () => {
    if (!window.confirm('Clear all tasks?')) return;
    setTasks([]);
    showNotify('All tasks cleared');
  };

  const toggleTheme = () => {
    setSettings((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  };

  const emailEnabled = false;

  const renderWeeklyStats = () => {
    const done = tasks.filter((t) => t.completed).length;
    return {
      total: tasks.length,
      completed: done,
      percentage: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      categories: categorySummary
    };
  };

  const stats = renderWeeklyStats();

  return (
    <div className="container">
      {notification && <div className="notification">{notification}</div>}
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
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode">{settings.theme === 'dark' ? '☀️' : '🌙'}</button>
        </div>
      </header>

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
          <div className="form-row">
            <div className="form-group">
              <label>Start Time</label>
              <input type="time" value={form.startOverride} onChange={(e) => setForm({ ...form, startOverride: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="form-row full">
            <div className="form-group">
              <label>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}></textarea>
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
            <button key={value} className={`filter-btn ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)}>
              {value === 'all' ? 'All' : value}
            </button>
          ))}
        </div>
        <div id="tasksList">
          {activeTasks.length === 0 ? (
            <div className="empty-state">No tasks found</div>
          ) : (
            activeTasks.map((task) => {
              const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < today;
              return (
                <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}>
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
                  </div>
                  <button className="task-edit" onClick={() => startEdit(task)}>✏️</button>
                  <button className="task-delete" onClick={() => deleteTask(task.id)}>✕</button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {editTaskId && (
        <div className="modal active" role="dialog" aria-modal="true" aria-label="Edit task">
          <div className="modal-content wide">
            <h3>Edit Task</h3>
            <form onSubmit={applyEdit}>
              <div className="form-group"><label>Name</label><input value={editForm?.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
              <div className="form-row">
                <div className="form-group"><label>Duration</label><input type="number" min="1" value={editForm?.duration} onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })} required /></div>
                <div className="form-group"><label>Priority</label><select value={editForm?.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Category</label><select value={editForm?.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}><option>Work</option><option>Personal</option><option>Health</option><option>Study</option><option>Other</option></select></div>
                <div className="form-group"><label>Due Date</label><input type="date" value={editForm?.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} /></div>
              </div>
              <div className="form-row full">
                <div className="form-group"><label>Notes</label><textarea value={editForm?.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}></textarea></div>
              </div>
              <div className="modal-buttons"><button className="modal-btn save" type="submit">Save</button><button className="modal-btn cancel" type="button" onClick={() => setEditTaskId(null)}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="modal active" role="dialog" aria-modal="true" aria-label="Settings">
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
              <h4>Day Start</h4>
              <input type="time" value={settings.startTime} onChange={(e) => setSettings({ ...settings, startTime: e.target.value })} />
            </div>
            <div className="settings-group">
              <h4>Notifications</h4>
              <select value={settings.sound} onChange={(e) => setSettings({ ...settings, sound: e.target.value })}>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>
            <div className="modal-buttons"><button className="modal-btn save" onClick={() => setIsSettingsOpen(false)}>Save</button><button className="modal-btn cancel" onClick={() => setIsSettingsOpen(false)}>Close</button></div>
          </div>
        </div>
      )}

    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
