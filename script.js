// EmailJS bundled inline — no CDN needed
        var emailjs = (function (exports) {
    'use strict';

    class EmailJSResponseStatus {
      constructor() {
        let _status = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
        let _text = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'Network Error';
        this.status = _status;
        this.text = _text;
      }
    }

    const createWebStorage = () => {
      if (typeof localStorage === 'undefined') return;
      return {
        get: key => Promise.resolve(localStorage.getItem(key)),
        set: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
        remove: key => Promise.resolve(localStorage.removeItem(key))
      };
    };

    const store = {
      origin: 'https://api.emailjs.com',
      blockHeadless: false,
      storageProvider: createWebStorage()
    };

    const buildOptions = options => {
      if (!options) return {};
      // support compatibility with SDK v3
      if (typeof options === 'string') {
        return {
          publicKey: options
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      if (options.toString() === '[object Object]') {
        return options;
      }
      return {};
    };

    /**
     * EmailJS global SDK config
     * @param {object} options - the EmailJS global SDK config options
     * @param {string} origin - the non-default EmailJS origin
     */
    const init = function (options) {
      let origin = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'https://api.emailjs.com';
      if (!options) return;
      const opts = buildOptions(options);
      store.publicKey = opts.publicKey;
      store.blockHeadless = opts.blockHeadless;
      store.storageProvider = opts.storageProvider;
      store.blockList = opts.blockList;
      store.limitRate = opts.limitRate;
      store.origin = opts.origin || origin;
    };

    const sendPost = async function (url, data) {
      let headers = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      const response = await fetch(store.origin + url, {
        method: 'POST',
        headers,
        body: data
      });
      const message = await response.text();
      const responseStatus = new EmailJSResponseStatus(response.status, message);
      if (response.ok) {
        return responseStatus;
      }
      throw responseStatus;
    };

    const validateParams = (publicKey, serviceID, templateID) => {
      if (!publicKey || typeof publicKey !== 'string') {
        throw 'The public key is required. Visit https://dashboard.emailjs.com/admin/account';
      }
      if (!serviceID || typeof serviceID !== 'string') {
        throw 'The service ID is required. Visit https://dashboard.emailjs.com/admin';
      }
      if (!templateID || typeof templateID !== 'string') {
        throw 'The template ID is required. Visit https://dashboard.emailjs.com/admin/templates';
      }
    };

    const validateTemplateParams = templateParams => {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      if (templateParams && templateParams.toString() !== '[object Object]') {
        throw 'The template params have to be the object. Visit https://www.emailjs.com/docs/sdk/send/';
      }
    };

    const isHeadless = navigator => {
      return navigator.webdriver || !navigator.languages || navigator.languages.length === 0;
    };

    const headlessError = () => {
      return new EmailJSResponseStatus(451, 'Unavailable For Headless Browser');
    };

    const validateBlockListParams = (list, watchVariable) => {
      if (!Array.isArray(list)) {
        throw 'The BlockList list has to be an array';
      }
      if (typeof watchVariable !== 'string') {
        throw 'The BlockList watchVariable has to be a string';
      }
    };

    const isBlockListDisabled = options => {
      return !options.list?.length || !options.watchVariable;
    };
    const getValue = (data, name) => {
      return data instanceof FormData ? data.get(name) : data[name];
    };
    const isBlockedValueInParams = (options, params) => {
      if (isBlockListDisabled(options)) return false;
      validateBlockListParams(options.list, options.watchVariable);
      const value = getValue(params, options.watchVariable);
      if (typeof value !== 'string') return false;
      return options.list.includes(value);
    };

    const blockedEmailError = () => {
      return new EmailJSResponseStatus(403, 'Forbidden');
    };

    const validateLimitRateParams = (throttle, id) => {
      if (typeof throttle !== 'number' || throttle < 0) {
        throw 'The LimitRate throttle has to be a positive number';
      }
      if (id && typeof id !== 'string') {
        throw 'The LimitRate ID has to be a non-empty string';
      }
    };

    const getLeftTime = async (id, throttle, storage) => {
      const lastTime = Number((await storage.get(id)) || 0);
      return throttle - Date.now() + lastTime;
    };
    const isLimitRateHit = async (defaultID, options, storage) => {
      if (!options.throttle || !storage) {
        return false;
      }
      validateLimitRateParams(options.throttle, options.id);
      const id = options.id || defaultID;
      const leftTime = await getLeftTime(id, options.throttle, storage);
      if (leftTime > 0) {
        return true;
      }
      await storage.set(id, Date.now().toString());
      return false;
    };

    const limitRateError = () => {
      return new EmailJSResponseStatus(429, 'Too Many Requests');
    };

    /**
     * Send a template to the specific EmailJS service
     * @param {string} serviceID - the EmailJS service ID
     * @param {string} templateID - the EmailJS template ID
     * @param {object} templateParams - the template params, what will be set to the EmailJS template
     * @param {object} options - the EmailJS SDK config options
     * @returns {Promise<EmailJSResponseStatus>}
     */
    const send = async (serviceID, templateID, templateParams, options) => {
      const opts = buildOptions(options);
      const publicKey = opts.publicKey || store.publicKey;
      const blockHeadless = opts.blockHeadless || store.blockHeadless;
      const storageProvider = opts.storageProvider || store.storageProvider;
      const blockList = {
        ...store.blockList,
        ...opts.blockList
      };
      const limitRate = {
        ...store.limitRate,
        ...opts.limitRate
      };
      if (blockHeadless && isHeadless(navigator)) {
        return Promise.reject(headlessError());
      }
      validateParams(publicKey, serviceID, templateID);
      validateTemplateParams(templateParams);
      if (templateParams && isBlockedValueInParams(blockList, templateParams)) {
        return Promise.reject(blockedEmailError());
      }
      if (await isLimitRateHit(location.pathname, limitRate, storageProvider)) {
        return Promise.reject(limitRateError());
      }
      const params = {
        lib_version: '4.4.1',
        user_id: publicKey,
        service_id: serviceID,
        template_id: templateID,
        template_params: templateParams
      };
      return sendPost('/api/v1.0/email/send', JSON.stringify(params), {
        'Content-type': 'application/json'
      });
    };

    const validateForm = form => {
      if (!form || form.nodeName !== 'FORM') {
        throw 'The 3rd parameter is expected to be the HTML form element or the style selector of the form';
      }
    };

    const findHTMLForm = form => {
      return typeof form === 'string' ? document.querySelector(form) : form;
    };
    /**
     * Send a form the specific EmailJS service
     * @param {string} serviceID - the EmailJS service ID
     * @param {string} templateID - the EmailJS template ID
     * @param {string | HTMLFormElement} form - the form element or selector
     * @param {object} options - the EmailJS SDK config options
     * @returns {Promise<EmailJSResponseStatus>}
     */
    const sendForm = async (serviceID, templateID, form, options) => {
      const opts = buildOptions(options);
      const publicKey = opts.publicKey || store.publicKey;
      const blockHeadless = opts.blockHeadless || store.blockHeadless;
      const storageProvider = store.storageProvider || opts.storageProvider;
      const blockList = {
        ...store.blockList,
        ...opts.blockList
      };
      const limitRate = {
        ...store.limitRate,
        ...opts.limitRate
      };
      if (blockHeadless && isHeadless(navigator)) {
        return Promise.reject(headlessError());
      }
      const currentForm = findHTMLForm(form);
      validateParams(publicKey, serviceID, templateID);
      validateForm(currentForm);
      const formData = new FormData(currentForm);
      if (isBlockedValueInParams(blockList, formData)) {
        return Promise.reject(blockedEmailError());
      }
      if (await isLimitRateHit(location.pathname, limitRate, storageProvider)) {
        return Promise.reject(limitRateError());
      }
      formData.append('lib_version', '4.4.1');
      formData.append('service_id', serviceID);
      formData.append('template_id', templateID);
      formData.append('user_id', publicKey);
      return sendPost('/api/v1.0/email/send-form', formData);
    };

    var index = {
      init,
      send,
      sendForm,
      EmailJSResponseStatus
    };

    exports.EmailJSResponseStatus = EmailJSResponseStatus;
    exports.default = index;
    exports.init = init;
    exports.send = send;
    exports.sendForm = sendForm;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});


        // Init EmailJS with your public key
        try { emailjs.init('6TkUC09vgoS1s3VUT'); } catch(e) { console.warn('EmailJS init:', e.message); }

        // Simple passthrough — emailjs is always available inline
        function loadEmailJS(callback) {
            callback();
        }

        const EMAIL_CONFIG = {
            serviceID: 'service_lzz2ilj',
            templateID: 'template_y8rc93f',
            recipientEmail: 'microoffice670@gmail.com'
        };

        const QUOTES = [
            "The only way to do great work is to love what you do.",
            "Success is not final, failure is not fatal.",
            "You are capable of amazing things.",
            "The future depends on what you do today.",
            "Don't watch the clock; do what it does. Keep going.",
            "Believe you can and you're halfway there.",
            "Great things never came from comfort zones.",
            "Dream bigger. Do bigger."
        ];

        // State
        let tasks = [];
        let streak = 0;
        let lastCompletionDate = null;
        let emailsEnabled = false;
        let weeklyHistory = {};
        let weeklyChart = null;
        let currentTaskId = null;

        // ── New feature state vars (must be before all functions) ──
        let appSettings = {
            recipientEmail: 'microoffice670@gmail.com',
            startTime: '09:00',
            sound: 'on'
        };
        let activeFilter = 'all';
        let searchQuery  = '';
        let deletedTask  = null;
        let undoTimer    = null;
        let carryDismissed = false;
        const timerMap   = {};

        function loadState() {
            try {
                tasks             = JSON.parse(localStorage.getItem('tasks')) || [];
                streak            = parseInt(localStorage.getItem('streak')) || 0;
                lastCompletionDate= localStorage.getItem('lastCompletionDate');
                emailsEnabled     = localStorage.getItem('emailsEnabled') === 'true';
                weeklyHistory     = JSON.parse(localStorage.getItem('weeklyHistory')) || {};
            } catch(e) {
                console.warn('loadState error:', e);
                tasks = []; streak = 0; weeklyHistory = {};
            }
        }

        function saveState() {
            try {
                localStorage.setItem('tasks', JSON.stringify(tasks));
                localStorage.setItem('streak', streak.toString());
                localStorage.setItem('lastCompletionDate', lastCompletionDate || '');
                localStorage.setItem('emailsEnabled', emailsEnabled.toString());
                localStorage.setItem('weeklyHistory', JSON.stringify(weeklyHistory));
            } catch(e) {
                showNotification('⚠️ Storage full — oldest data may not be saved', 'error');
            }
        }

        function showNotification(msg, type = 'success') {
            const notif = document.createElement('div');
            notif.className = 'notification';
            notif.textContent = msg;
            if (type === 'error') notif.style.background = '#ef4444';
            if (type === 'info')  notif.style.background = '#3b82f6';
            notif.style.opacity = '0';
            notif.style.transform = 'translateX(20px)';
            document.body.appendChild(notif);

            if (window.gsap) {
                gsap.to(notif, { duration: 0.48, opacity: 1, x: 0, ease: 'power3.out' });
                gsap.to(notif, {
                    duration: 0.4,
                    opacity: 0,
                    y: -24,
                    delay: 2.3,
                    ease: 'power3.in',
                    onComplete: () => notif.remove()
                });
            } else {
                notif.style.opacity = '1';
                setTimeout(() => notif.remove(), 3000);
            }
        }

        function initGSAP() {
            if (!window.gsap) return;
            gsap.registerPlugin(ScrollTrigger);

            gsap.from('header', {
                y: -38,
                opacity: 0,
                duration: 0.72,
                ease: 'expo.out'
            });

            gsap.from('.quote-bar, .email-section, .progress-section, .weekly-section, .heatmap-section, .form-section, .timeline-section', {
                delay: 0.18,
                y: 20,
                opacity: 0,
                stagger: 0.05,
                duration: 0.64,
                ease: 'power2.out'
            });

            gsap.from('.carry-banner', {
                y: -16,
                opacity: 0,
                duration: 0.5,
                ease: 'back.out(1.1)'
            });

            gsap.utils.toArray('.task-item').forEach((item, i) => {
                gsap.from(item, {
                    delay: 0.35 + i * 0.06,
                    y: 18,
                    opacity: 0,
                    duration: 0.5,
                    ease: 'power2.out'
                });
            });

            gsap.from('.progress-bar', {
                width: 0,
                duration: 0.8,
                delay: 0.35,
                ease: 'power3.out'
            });

            // Hover pulse effect for interactive buttons
            gsap.utils.toArray('button, .filter-btn, .month-btn').forEach(el => {
                el.addEventListener('mouseenter', () => gsap.to(el, { scale: 1.04, duration: 0.16, ease: 'power1.out' }));
                el.addEventListener('mouseleave', () => gsap.to(el, { scale: 1, duration: 0.16, ease: 'power1.out' }));
            });

            // Seamless task card entry after render call
            new MutationObserver(() => {
                const current = document.querySelectorAll('.task-item:not(.animated)');
                current.forEach((item, i) => {
                    item.classList.add('animated');
                    gsap.fromTo(item, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, delay: i * 0.04, ease: 'power2.out' });
                });
            }).observe(document.getElementById('tasksList'), { childList: true });
        }

        // FIX 1: XSS protection — escape all user-supplied strings before injecting into innerHTML
        function esc(str) {
            return String(str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        // UTC DATE FIX: always use LOCAL date (not UTC) to avoid off-by-1-day bug in IST/other timezones
        function localDateStr(d) {
            const dt = d || new Date();
            const y  = dt.getFullYear();
            const m  = String(dt.getMonth() + 1).padStart(2, '0');
            const dy = String(dt.getDate()).padStart(2, '0');
            return `${y}-${m}-${dy}`;
        }

        // ── Recurring task restore on new day ──
        function restoreRecurringTasks() {
            const today      = localDateStr();
            const lastDate   = localStorage.getItem('lastRecurringDate');
            if (lastDate === today) return;  // already restored today
            localStorage.setItem('lastRecurringDate', today);
            const dayOfWeek  = new Date().getDay(); // 0=Sun,6=Sat
            const isWeekday  = dayOfWeek >= 1 && dayOfWeek <= 5;
            const dayNames   = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
            const todayName  = dayNames[dayOfWeek];
            // Remove yesterday's completed recurring tasks, keep incomplete ones
            const recurring  = tasks.filter(t => t.recurring && t.recurring !== 'none');
            tasks = tasks.filter(t => !t.recurring || t.recurring === 'none' || !t.completed);
            // Add fresh copies for today
            recurring.forEach(t => {
                const shouldAdd =
                    t.recurring === 'daily' ||
                    (t.recurring === 'weekdays' && isWeekday) ||
                    (t.recurring === 'weekly'   && todayName === (t.weekDay || 'monday'));
                if (shouldAdd && !tasks.find(x => x.recurringParentId === t.id)) {
                    tasks.push({
                        ...t,
                        id: Date.now() + Math.floor(Math.random() * 10000),
                        recurringParentId: t.id,
                        completed: false,
                        actualDuration: null
                    });
                }
            });
            saveState();
        }

        function init() {
            loadState();
            loadSettings();
            restoreRecurringTasks();
            updateDate();
            setupTheme();
            attachEvents();
            render();
            updateEmailUI();
            updateWeekly();   // FIX 6: single call here only
            startScheduler();
            showQuote();
            renderHeatmap();
            checkCarryForward();
            initGSAP();
            // FIX 10: set streak display once here
            document.getElementById('streakCount').textContent = streak + ' 🔥';
        }

        function attachEvents() {
            document.getElementById('taskForm').addEventListener('submit', (e) => {
                e.preventDefault();
                addTask();
            });
            document.getElementById('themeToggle').addEventListener('click', toggleTheme);
            document.getElementById('clearAllBtn').addEventListener('click', clearAll);
            document.getElementById('emailToggleBtn').addEventListener('click', toggleEmails);
            document.getElementById('sendProgressBtn').addEventListener('click', sendProgressEmail);
            document.getElementById('sendEODBtn').addEventListener('click', sendEndOfDayEmail);
            document.getElementById('sendWeeklyBtn').addEventListener('click', sendWeeklyEmail);
            document.getElementById('saveActualBtn').addEventListener('click', saveActual);
            document.getElementById('cancelActualBtn').addEventListener('click', cancelActual);
            // NEW
            document.getElementById('settingsBtn').addEventListener('click', openSettings);
            document.getElementById('saveSettingsBtn').addEventListener('click', applySettings);
            document.getElementById('cancelSettingsBtn').addEventListener('click', closeSettings);
            document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
            document.getElementById('cancelEditBtn').addEventListener('click', closeEdit);
            document.getElementById('searchInput').addEventListener('input', (e) => {
                searchQuery = e.target.value;
                render();
            });
            // FIX 8: Click backdrop (the modal overlay itself) to close any modal
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('active');
                        currentTaskId = null;
                    }
                });
            });
        }

        function updateDate() {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById('currentDate').textContent = new Date().toLocaleDateString(undefined, options);
        }

        function setupTheme() {
            if (localStorage.getItem('theme') === 'dark') {
                document.body.classList.add('dark-mode');
                document.getElementById('themeToggle').textContent = '☀️';
            }
        }

        function toggleTheme() {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
            // FIX 5: Redraw chart and heatmap so colors update immediately
            updateWeekly();
            renderHeatmap();
        }

        function toggleEmails() {
            emailsEnabled = !emailsEnabled;
            saveState();
            updateEmailUI();
            showNotification(emailsEnabled ? '✅ Emails enabled!' : '❌ Emails disabled', 'info');
        }

        function updateEmailUI() {
            const section    = document.getElementById('emailSection');
            const statusText = document.getElementById('emailStatusText');
            const toggleBtn  = document.getElementById('emailToggleBtn');
            const buttons    = document.getElementById('emailButtons');

            if (emailsEnabled) {
                section.classList.add('enabled');
                statusText.textContent = '✅ Emails: Enabled';
                toggleBtn.textContent  = 'Disable Emails';
                toggleBtn.classList.add('enabled');
                buttons.classList.add('show');
            } else {
                section.classList.remove('enabled');
                statusText.textContent = '📧 Emails: Disabled';
                toggleBtn.textContent  = 'Enable Emails';
                toggleBtn.classList.remove('enabled');
                buttons.classList.remove('show');
            }
        }

        function addTask() {
            const name     = document.getElementById('taskName').value.trim();
            const duration = parseInt(document.getElementById('taskDuration').value);
            const priority = document.getElementById('taskPriority').value;
            const category = document.getElementById('taskCategory').value;
            const notes    = document.getElementById('taskNotes').value.trim();
            const startOverride = document.getElementById('taskStartTime').value || null;
            const dueDate  = document.getElementById('taskDueDate').value || null;
            const recurring    = document.getElementById('taskRecurring').value || 'none';

            if (!name || isNaN(duration) || duration < 1) {
                showNotification('Please fill all fields correctly', 'error');
                return;
            }
            if (dueDate) {
                const due = new Date(dueDate);
                const today = new Date();
                today.setHours(0,0,0,0);
                if (due < today) {
                    showNotification('Due date cannot be in the past', 'error');
                    return;
                }
            }

            tasks.push({
                id: Date.now() + Math.floor(Math.random() * 10000),
                name,
                duration,
                priority,
                category,
                notes,
                startOverride,
                dueDate,
                recurring,
                completed: false,
                actualDuration: null
            });

            saveState();
            render();
            document.getElementById('taskForm').reset();
            showNotification(`✅ Task added: ${name}`);
        }

        function calculateTimeSlots() {
            const now = new Date();
            const [sh, sm] = (appSettings.startTime || '09:00').split(':').map(Number);
            const dayStart = new Date();
            dayStart.setHours(sh, sm, 0, 0);
            let cursor = (now > dayStart) ? new Date(now) : new Date(dayStart);
            cursor.setSeconds(0, 0);
            cursor.setMinutes(Math.ceil(cursor.getMinutes() / 5) * 5);

            return tasks.map(task => {
                // If task has a manual start override, use it
                if (task.startOverride) {
                    const [h, m] = task.startOverride.split(':').map(Number);
                    const override = new Date();
                    override.setHours(h, m, 0, 0);
                    cursor = new Date(override);
                }
                const start = new Date(cursor);
                cursor.setMinutes(cursor.getMinutes() + task.duration);
                const end = new Date(cursor);
                return { ...task, startTime: start, endTime: end };
            });
        }

        function render() {
            const scheduled = calculateTimeSlots();
            const list = document.getElementById('tasksList');
            const now  = new Date();

            if (scheduled.length === 0) {
                list.innerHTML = '<div class="empty-state">⏰ No tasks scheduled</div>';
                updateProgress();
                return;
            }

            const sortedScheduled = [...scheduled].sort((a, b) => {
                if (a.dueDate && b.dueDate) {
                    const ad = new Date(a.dueDate);
                    const bd = new Date(b.dueDate);
                    if (ad < bd) return -1;
                    if (ad > bd) return 1;
                } else if (a.dueDate) {
                    return -1;
                } else if (b.dueDate) {
                    return 1;
                }
                const order = { High: 0, Medium: 1, Low: 2 };
                return (order[a.priority] || 3) - (order[b.priority] || 3);
            });

            const visible = getFilteredTasks(sortedScheduled);
            if (visible.length === 0) {
                list.innerHTML = '<div class="empty-state">🔍 No tasks match your filter</div>';
                updateProgress();
                return;
            }
            list.innerHTML = visible.map(task => {
                const taskDueDate = task.dueDate ? new Date(task.dueDate) : null;
                const isOverdue = !task.completed && ((taskDueDate && taskDueDate < now) || (!taskDueDate && now > task.endTime));
                const dueLabel = taskDueDate ? `<span class="badge badge-due">Due ${taskDueDate.toLocaleDateString()}</span>` : '';
                const start = task.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const end   = task.endTime.toLocaleTimeString([],   { hour: '2-digit', minute: '2-digit' });
                const cat   = task.category ? `<span class="badge badge-cat">${esc(task.category)}</span>` : '';
                const rec   = (task.recurring && task.recurring !== 'none') ? `<span class="badge badge-recurring">🔁 ${esc(task.recurring)}</span>` : '';
                const timerState = timerMap[task.id];
                const timerSecs  = timerState ? timerState.remaining : task.duration * 60;
                const tm = Math.floor(timerSecs / 60), ts = timerSecs % 60;
                const timerLabel = `${String(tm).padStart(2,'0')}:${String(ts).padStart(2,'0')}`;
                const timerRunning = timerState && timerState.running;

                return `
                    <div class="task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
                        <input type="checkbox" class="task-checkbox"
                               ${task.completed ? 'checked' : ''}
                               onchange="toggleTask(${task.id})">
                        <div class="task-content">
                            <div class="task-title">${esc(task.name)}</div>
                            <div class="task-meta">
                                <span class="badge badge-${task.priority.toLowerCase()}">${esc(task.priority)}</span>
                                ${cat}
                                ${rec}
                                ${dueLabel}
                                <span>⏱️ ${task.duration}m</span>
                                <span>${start} – ${end}</span>
                                ${task.actualDuration ? `<span style="color:#10b981;">✓ ${task.actualDuration}m actual</span>` : ''}
                                ${isOverdue && !task.completed ? '<span style="color:#ef4444;">⚠️ Overdue</span>' : ''}
                                ${!task.completed ? `
                                <button class="task-timer-btn ${timerRunning ? 'running' : ''}" id="timerBtn_${task.id}" onclick="toggleTimer(${task.id})">${timerRunning ? '⏸' : '▶'}</button>
                                <span class="task-timer-display" id="timerDisp_${task.id}">${timerLabel}</span>` : ''}
                            </div>
                            ${task.notes ? `<div class="task-notes-text">📝 ${esc(task.notes)}</div>` : ''}
                        </div>
                        <button class="task-edit" onclick="openEdit(${task.id})" title="Edit task" aria-label="Edit task">✏️</button>
                        <button class="task-delete" onclick="deleteTask(${task.id})" title="Delete task" aria-label="Delete task">✕</button>
                    </div>
                `;
            }).join('');

            updateProgress();
        }

        function toggleTask(id) {
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                if (task.completed) {
                    // FIX 2: Stop timer when task is marked complete
                    if (timerMap[id]) {
                        clearInterval(timerMap[id].interval);
                        timerMap[id].running = false;
                    }
                    currentTaskId = id;
                    document.getElementById('actualDuration').value = task.duration;
                    document.getElementById('completionModal').classList.add('active');
                } else {
                    task.actualDuration = null;
                    // FIX 2: Also clear timer state when unchecking a task
                    if (timerMap[id]) {
                        clearInterval(timerMap[id].interval);
                        delete timerMap[id];
                    }
                    saveState();
                    render();
                }
            }
        }

        function deleteTask(id) {
            const idx  = tasks.findIndex(t => t.id === id);
            if (idx === -1) return;
            const task = tasks[idx];
            tasks.splice(idx, 1);
            saveState();
            render();
            showUndoBar(task, idx);
            if (timerMap[id]) { clearInterval(timerMap[id].interval); delete timerMap[id]; }
        }

        function clearAll() {
            if (tasks.length === 0) return;
            // FIX 9: use undo pattern instead of confirm() dialog
            const snapshot = [...tasks];
            // FIX 3: Stop and clear all running timers
            Object.keys(timerMap).forEach(id => {
                clearInterval(timerMap[id].interval);
                delete timerMap[id];
            });
            tasks = [];
            saveState();
            render();
            // Show undo bar with restore ability
            clearTimeout(undoTimer);
            const existing = document.getElementById('undoBar');
            if (existing) existing.remove();
            const bar = document.createElement('div');
            bar.className = 'undo-bar';
            bar.id = 'undoBar';
            bar.innerHTML = `<span>🗑 All ${snapshot.length} tasks cleared</span><button onclick="restoreAllTasks(${JSON.stringify(snapshot).split('').map(c => '&#'+c.charCodeAt(0)+';').join('')})">Undo</button>`;
            // Safer approach — store snapshot in closure
            const undoBtn = document.createElement('button');
            undoBtn.textContent = 'Undo';
            undoBtn.onclick = () => { tasks = snapshot; saveState(); render(); bar.remove(); clearTimeout(undoTimer); showNotification('↩️ All tasks restored!'); };
            bar.innerHTML = '';
            const span = document.createElement('span');
            span.textContent = `🗑 All ${snapshot.length} tasks cleared`;
            bar.appendChild(span);
            bar.appendChild(undoBtn);
            document.body.appendChild(bar);
            undoTimer = setTimeout(() => bar.remove(), 5000);
        }

        function saveActual() {
            const inputVal = parseInt(document.getElementById('actualDuration').value);
            const task = tasks.find(t => t.id === currentTaskId);
            if (task) {
                task.actualDuration = (inputVal && inputVal > 0) ? inputVal : task.duration;
            }
            closeModal();
            saveState();
            render();
            checkStreak();
            playSound();
            saveYesterdaySnapshot();
            renderHeatmap();
            showNotification('✅ Task saved!');
        }

        function cancelActual() {
            const task = tasks.find(t => t.id === currentTaskId);
            if (task) {
                task.actualDuration = task.duration;
            }
            closeModal();
            saveState();
            render();
            checkStreak();
            saveYesterdaySnapshot();
            renderHeatmap();
        }

        function closeModal() {
            document.getElementById('completionModal').classList.remove('active');
            currentTaskId = null;
        }

        function updateProgress() {
            const completed = tasks.filter(t => t.completed).length;
            const percent   = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
            document.getElementById('progressBar').style.width = percent + '%';
            document.getElementById('progressText').textContent = percent + '%';
            // FIX 7: keep heatmap live whenever progress changes
            renderHeatmap();
        }

        function checkStreak() {
            const today = new Date().toDateString();
            if (lastCompletionDate === today) return;
            if (tasks.length === 0) return;

            const completed = tasks.filter(t => t.completed).length;
            const percent   = (completed / tasks.length) * 100;

            if (percent >= 80) {
                streak++;
                lastCompletionDate = today;
                saveState();
                document.getElementById('streakCount').textContent = streak + ' 🔥';
                showNotification('🔥 Streak increased!');
            }
        }

        function getProgressBar(pct) {
            const filled = Math.round(pct / 10);
            return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${pct}%`;
        }

        function getQuote() {
            return QUOTES[Math.floor(Math.random() * QUOTES.length)];
        }

        function showDebugError(msg) {
            removeDebugError();
            const box = document.createElement('div');
            box.className = 'debug-error';
            box.id = 'debugError';
            box.textContent = msg;
            document.body.appendChild(box);
        }

        function removeDebugError() {
            const existing = document.getElementById('debugError');
            if (existing) existing.remove();
        }

        // Send Progress Email — loads EmailJS on demand so it's always available
        function sendProgressEmail() {
            if (tasks.length === 0) { showNotification('No tasks to report', 'error'); return; }
            loadEmailJS(async () => {
                const completed     = tasks.filter(t => t.completed);
                const remaining     = tasks.filter(t => !t.completed);
                const percent       = Math.round((completed.length / tasks.length) * 100);
                const completedText = completed.map(t => `✓ ${t.name} (${t.duration}m)`).join('\n') || 'None';
                const remainingText = remaining.map(t => `○ ${t.name} (${t.duration}m)`).join('\n') || 'All done!';
                try {
                    document.getElementById('sendProgressBtn').disabled = true;
                    await emailjs.send(EMAIL_CONFIG.serviceID, EMAIL_CONFIG.templateID, {
                        to_email: EMAIL_CONFIG.recipientEmail,
                        date: new Date().toLocaleString(),
                        completed: completedText,
                        remaining: remainingText,
                        progress: getProgressBar(percent)
                    });
                    showNotification('✅ Progress email sent!');
                    removeDebugError();
                } catch (e) {
                    showNotification('❌ Failed to send email', 'error');
                    showDebugError(`ERROR: ${e.text || e.message || JSON.stringify(e)}`);
                } finally {
                    document.getElementById('sendProgressBtn').disabled = false;
                }
            });
        }

        // Send End-of-Day Email
        function sendEndOfDayEmail() {
            loadEmailJS(async () => {
                const completed      = tasks.filter(t => t.completed);
                const incomplete     = tasks.filter(t => !t.completed);
                const percent        = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;
                const completedText  = completed.map(t => `✓ ${t.name} - ${t.actualDuration || t.duration}m`).join('\n') || 'None';
                const incompleteText = incomplete.map(t => `○ ${t.name} - ${t.duration}m`).join('\n') || 'All done!';
                try {
                    document.getElementById('sendEODBtn').disabled = true;
                    await emailjs.send(EMAIL_CONFIG.serviceID, EMAIL_CONFIG.templateID, {
                        to_email: EMAIL_CONFIG.recipientEmail,
                        date: new Date().toLocaleDateString(),
                        completed: completedText,
                        remaining: incompleteText,
                        progress: getProgressBar(percent)
                    });
                    const today = localDateStr();
                    weeklyHistory[today] = percent;
                    saveState();
                    updateWeekly();
                    showNotification('✅ EOD email sent!');
                    removeDebugError();
                } catch (e) {
                    showNotification('❌ Failed to send email', 'error');
                    showDebugError(`ERROR: ${e.text || e.message || JSON.stringify(e)}`);
                } finally {
                    document.getElementById('sendEODBtn').disabled = false;
                }
            });
        }

        // Send Weekly Email
        function sendWeeklyEmail() {
            loadEmailJS(async () => {
                const dayNames  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const today     = new Date();
                const day       = today.getDay();
                const diff      = today.getDate() - day + (day === 0 ? -6 : 1);
                const startDate = new Date(today);
                startDate.setDate(diff);
                let breakdown = '';
                for (let i = 0; i < 7; i++) {
                    const d = new Date(startDate);
                    d.setDate(d.getDate() + i);
                    breakdown += `${dayNames[i]}: ${getProgressBar(weeklyHistory[localDateStr(d)] || 0)}\n`;
                }
                try {
                    document.getElementById('sendWeeklyBtn').disabled = true;
                    await emailjs.send(EMAIL_CONFIG.serviceID, EMAIL_CONFIG.templateID, {
                        to_email: EMAIL_CONFIG.recipientEmail,
                        date: 'Weekly Report',
                        completed: breakdown,
                        remaining: `Streak: ${streak} 🔥`,
                        progress: streak >= 3 ? '🎯 Amazing consistency!' : 'Keep building your streak!'
                    });
                    showNotification('✅ Weekly email sent!');
                    removeDebugError();
                } catch (e) {
                    showNotification('❌ Failed to send email', 'error');
                    showDebugError(`ERROR: ${e.text || e.message || JSON.stringify(e)}`);
                } finally {
                    document.getElementById('sendWeeklyBtn').disabled = false;
                }
            });
        }

        function updateWeekly() {
            const today     = new Date();
            const day       = today.getDay();
            const diff      = today.getDate() - day + (day === 0 ? -6 : 1);
            const startDate = new Date(today);
            startDate.setDate(diff);

            const percentages = [];
            const dayLabels   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

            for (let i = 0; i < 7; i++) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                const dateStr = localDateStr(d);
                percentages.push(weeklyHistory[dateStr] || 0);
            }

            const values = percentages.filter(v => v > 0);
            const avg    = values.length > 0 ? Math.round(values.reduce((a, b) => a + b) / values.length) : 0;

            // FIX #2: Don't inject extra 0 into Math.max/min — use only real data
            const best     = values.length > 0 ? Math.max(...percentages) : 0;
            const worst    = values.length > 0 ? Math.min(...values)      : 0;
            const bestIdx  = percentages.indexOf(best);
            const worstIdx = percentages.indexOf(worst);

            // FIX #3: Show count of active days, not sum of percentages
            const activeDays = Object.values(weeklyHistory).filter(v => v > 0).length;
            document.getElementById('totalTasksWeek').textContent    = activeDays;
            document.getElementById('avgCompletionWeek').textContent = avg + '%';
            document.getElementById('bestDayWeek').textContent       = values.length > 0 ? (dayLabels[bestIdx]  || '-') : '-';
            document.getElementById('worstDayWeek').textContent      = values.length > 0 ? (dayLabels[worstIdx] || '-') : '-';

            updateChart(dayLabels, percentages);
        }

        function updateChart(labels, data) {
            const ctx = document.getElementById('weeklyChart');
            if (!ctx) return;
            if (weeklyChart) weeklyChart.destroy();

            const isDark = document.body.classList.contains('dark-mode');
            weeklyChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Completion %',
                        data,
                        backgroundColor: '#3b82f6',
                        borderColor: '#2563eb',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: v => v + '%',
                                color: isDark ? '#9ca3af' : '#6b7280'
                            },
                            grid: { color: isDark ? '#374151' : '#e5e7eb' }
                        },
                        x: {
                            ticks: { color: isDark ? '#9ca3af' : '#6b7280' },
                            grid:  { display: false }
                        }
                    }
                }
            });
        }

        function startScheduler() {
            setInterval(() => {
                const now = new Date();
                const h   = now.getHours();
                const m   = now.getMinutes();
                if (emailsEnabled) {
                    if ([9, 12, 15, 18, 21].includes(h) && m === 0) sendProgressEmail();
                    if (h === 22 && m === 0) sendEndOfDayEmail();
                    if (now.getDay() === 0 && h === 20 && m === 0) sendWeeklyEmail();
                }
            }, 60000);
        }


        // ═══════════════════════════════════════════════════
        //  NEW FEATURES — added on top of existing code
        // ═══════════════════════════════════════════════════

        // ────────────────────────────────────────────
        //  LOAD / SAVE extended settings
        // ────────────────────────────────────────────
        function loadSettings() {
            const s = localStorage.getItem('appSettings');
            if (s) {
                appSettings = { ...appSettings, ...JSON.parse(s) };
                EMAIL_CONFIG.recipientEmail = appSettings.recipientEmail;
            }
        }
        function saveSettings() {
            localStorage.setItem('appSettings', JSON.stringify(appSettings));
            EMAIL_CONFIG.recipientEmail = appSettings.recipientEmail;
        }

        // ────────────────────────────────────────────
        //  QUOTE BAR
        // ────────────────────────────────────────────
        function showQuote() {
            const el = document.getElementById('quoteBar');
            if (el) el.textContent = '💬 ' + getQuote();
        }

        // ────────────────────────────────────────────
        //  SETTINGS MODAL
        // ────────────────────────────────────────────
        function openSettings() {
            document.getElementById('settingsEmail').value     = appSettings.recipientEmail;
            document.getElementById('settingsStartTime').value = appSettings.startTime;
            document.getElementById('settingsSound').value     = appSettings.sound;
            document.getElementById('settingsModal').classList.add('active');
        }
        function closeSettings() {
            document.getElementById('settingsModal').classList.remove('active');
        }
        function applySettings() {
            const email = document.getElementById('settingsEmail').value.trim();
            const time  = document.getElementById('settingsStartTime').value;
            const sound = document.getElementById('settingsSound').value;
            if (email) appSettings.recipientEmail = email;
            if (time)  appSettings.startTime      = time;
            appSettings.sound = sound;
            saveSettings();
            closeSettings();
            showNotification('✅ Settings saved!');
        }

        // ────────────────────────────────────────────
        //  EDIT TASK
        // ────────────────────────────────────────────
        function openEdit(id) {
            const task = tasks.find(t => t.id === id);
            if (!task) return;
            currentTaskId = id;
            document.getElementById('editName').value      = task.name;
            document.getElementById('editDuration').value  = task.duration;
            document.getElementById('editPriority').value  = task.priority;
            document.getElementById('editCategory').value  = task.category   || 'Work';
            document.getElementById('editRecurring').value = task.recurring  || 'none';
            document.getElementById('editStartTime').value = task.startOverride || '';
            document.getElementById('editDueDate').value   = task.dueDate || '';
            document.getElementById('editNotes').value     = task.notes || '';
            document.getElementById('editModal').classList.add('active');
        }
        function closeEdit() {
            document.getElementById('editModal').classList.remove('active');
            currentTaskId = null;
        }
        function saveEdit() {
            const task = tasks.find(t => t.id === currentTaskId);
            if (!task) return;
            const name     = document.getElementById('editName').value.trim();
            const duration = parseInt(document.getElementById('editDuration').value);
            if (!name || isNaN(duration) || duration < 1) {
                showNotification('Please fill all fields correctly', 'error'); return;
            }
            const editDueDate = document.getElementById('editDueDate').value || null;
            if (editDueDate) {
                const due = new Date(editDueDate);
                const today = new Date();
                today.setHours(0,0,0,0);
                if (due < today) {
                    showNotification('Due date cannot be in the past', 'error'); return;
                }
            }
            task.name          = name;
            task.duration      = duration;
            task.priority      = document.getElementById('editPriority').value;
            task.category      = document.getElementById('editCategory').value;
            task.recurring     = document.getElementById('editRecurring').value || 'none';
            task.startOverride = document.getElementById('editStartTime').value || null;
            task.dueDate       = document.getElementById('editDueDate').value || null;
            task.notes         = document.getElementById('editNotes').value.trim();
            closeEdit();
            saveState();
            render();
            showNotification('✅ Task updated!');
        }

        // ────────────────────────────────────────────
        //  FILTER & SEARCH
        // ────────────────────────────────────────────
        function setFilter(filter, btn) {
            activeFilter = filter;
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active','active-high','active-medium','active-low');
            });
            const cls = filter === 'High' ? 'active-high'
                      : filter === 'Medium' ? 'active-medium'
                      : filter === 'Low'  ? 'active-low' : 'active';
            btn.classList.add(cls);
            render();
        }

        function getFilteredTasks(scheduled) {
            const q = searchQuery.toLowerCase();
            return scheduled.filter(task => {
                const matchSearch = !q || task.name.toLowerCase().includes(q)
                    || (task.notes || '').toLowerCase().includes(q)
                    || (task.category || '').toLowerCase().includes(q);
                const matchFilter =
                    activeFilter === 'all'    ? true :
                    activeFilter === 'pending'? !task.completed :
                    activeFilter === 'done'   ? task.completed :
                    task.priority === activeFilter;
                return matchSearch && matchFilter;
            });
        }

        // ────────────────────────────────────────────
        //  UNDO DELETE
        // ────────────────────────────────────────────
        function showUndoBar(task, idx) {
            deletedTask = { task, idx };
            clearTimeout(undoTimer);
            const existing = document.getElementById('undoBar');
            if (existing) existing.remove();
            const bar = document.createElement('div');
            bar.className = 'undo-bar';
            bar.id = 'undoBar';
            bar.innerHTML = `<span>🗑 "${task.name}" deleted</span><button onclick="undoDelete()">Undo</button>`;
            document.body.appendChild(bar);
            undoTimer = setTimeout(() => { bar.remove(); deletedTask = null; }, 5000);
        }
        function undoDelete() {
            if (!deletedTask) return;
            tasks.splice(deletedTask.idx, 0, deletedTask.task);
            saveState(); render();
            document.getElementById('undoBar')?.remove();
            clearTimeout(undoTimer);
            deletedTask = null;
            showNotification('↩️ Task restored!');
        }

        // ────────────────────────────────────────────
        //  TASK TIMER (per task countdown)
        // ────────────────────────────────────────────
        function toggleTimer(id) {
            const task = tasks.find(t => t.id === id);
            if (!task || task.completed) return;
            if (!timerMap[id]) {
                timerMap[id] = { remaining: task.duration * 60, running: false, interval: null };
            }
            const t = timerMap[id];
            if (t.running) {
                clearInterval(t.interval);
                t.running = false;
            } else {
                t.running = true;
                t.interval = setInterval(() => {
                    t.remaining--;
                    updateTimerDisplay(id);
                    if (t.remaining <= 0) {
                        clearInterval(t.interval);
                        t.running = false;
                        playSound();
                        showNotification(`⏰ Time's up: ${task.name}!`);
                    }
                }, 1000);
            }
            updateTimerDisplay(id);
        }
        function updateTimerDisplay(id) {
            const t = timerMap[id];
            if (!t) return;
            const btn = document.getElementById('timerBtn_' + id);
            const disp = document.getElementById('timerDisp_' + id);
            if (!btn || !disp) return;
            const m = Math.floor(Math.abs(t.remaining) / 60);
            const s = Math.abs(t.remaining) % 60;
            disp.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            disp.classList.toggle('urgent', t.remaining <= 60 && t.remaining > 0);
            btn.textContent = t.running ? '⏸' : '▶';
            btn.classList.toggle('running', t.running);
        }

        // ────────────────────────────────────────────
        //  SOUND
        // ────────────────────────────────────────────
        function playSound() {
            if (appSettings.sound !== 'on') return;
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.4);
            } catch(e) {}
        }

        // ────────────────────────────────────────────
        //  MONTHLY HEATMAP
        // ────────────────────────────────────────────
        function renderHeatmap() {
            const grid  = document.getElementById('heatmapGrid');
            if (!grid) return;
            const now   = new Date();
            const year  = now.getFullYear();
            const month = now.getMonth();
            const today = localDateStr(now);
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const dayLabels = ['Su','Mo','Tu','We','Th','Fr','Sa'];

            // FIX 7: merge weeklyHistory with live today's progress
            const liveHistory = { ...weeklyHistory };
            if (tasks.length > 0) {
                const livePct = Math.round(tasks.filter(t => t.completed).length / tasks.length * 100);
                liveHistory[today] = livePct;
            }

            let cells = dayLabels.map(d => `<div class="heatmap-day-label">${d}</div>`).join('');
            for (let i = 0; i < firstDay; i++) {
                cells += `<div class="heatmap-cell empty"></div>`;
            }
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const pct = liveHistory[dateStr];
                let level = '0';
                if (pct !== undefined) {
                    if      (pct >= 100) level = 'perfect';
                    else if (pct >= 75)  level = 'high';
                    else if (pct >= 40)  level = 'mid';
                    else                 level = 'low';
                }
                const isToday = dateStr === today ? 'today' : '';
                const label   = dateStr === today ? ' (live)' : '';
                cells += `<div class="heatmap-cell ${isToday}" data-pct="${pct !== undefined ? level : '0'}">
                    <div class="heatmap-tooltip">${dateStr}${pct !== undefined ? ': '+pct+'%'+label : ': no data'}</div>
                </div>`;
            }
            grid.innerHTML = cells;
        }

        // ────────────────────────────────────────────
        //  CARRY FORWARD
        // ────────────────────────────────────────────
        function checkCarryForward() {
            if (carryDismissed) return;
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = localDateStr(yesterday);
            const savedDate = localStorage.getItem('lastTaskDate');
            if (savedDate !== yStr) return;
            const saved = JSON.parse(localStorage.getItem('yesterdayTasks') || '[]');
            const incomplete = saved.filter(t => !t.completed);
            if (incomplete.length === 0) return;
            document.getElementById('carryCount').textContent = incomplete.length;
            document.getElementById('carryBanner').style.display = 'flex';
        }
        function carryForward() {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = localDateStr(yesterday);
            const saved = JSON.parse(localStorage.getItem('yesterdayTasks') || '[]');
            const incomplete = saved.filter(t => !t.completed);
            incomplete.forEach(t => {
                tasks.push({ ...t, id: Date.now() + Math.random(), completed: false, actualDuration: null });
            });
            saveState(); render();
            dismissCarry();
            showNotification(`✅ ${incomplete.length} tasks carried forward!`);
        }
        function dismissCarry() {
            carryDismissed = true;
            document.getElementById('carryBanner').style.display = 'none';
        }
        function saveYesterdaySnapshot() {
            const today = localDateStr();
            localStorage.setItem('lastTaskDate', today);
            localStorage.setItem('yesterdayTasks', JSON.stringify(tasks));
        }

        // ────────────────────────────────────────────
        //  EXPORT CSV
        // ────────────────────────────────────────────
        function exportCSV() {
            if (tasks.length === 0) { showNotification('No tasks to export', 'error'); return; }
            // FIX 15: properly escape CSV fields — wrap in quotes and escape inner quotes
            const csvField = v => '"' + String(v || '').replace(/"/g, '""') + '"';
            const rows = [['Name','Duration','Priority','Category','Completed','Actual Duration','Notes']];
            tasks.forEach(t => {
                rows.push([
                    csvField(t.name),
                    t.duration,
                    csvField(t.priority),
                    csvField(t.category || 'Work'),
                    t.completed ? 'Yes' : 'No',
                    t.actualDuration || '',
                    csvField(t.notes || '')
                ]);
            });
            const csv  = rows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url; a.download = `tasks_${localDateStr()}.csv`;
            a.click(); URL.revokeObjectURL(url);
            showNotification('✅ Tasks exported!');
        }

        // ────────────────────────────────────────────
        //  EXPORT BACKUP JSON
        // ────────────────────────────────────────────
        function exportBackup() {
            const backup = {
                tasks, streak, lastCompletionDate, emailsEnabled,
                weeklyHistory, appSettings, exportedAt: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url; a.download = `planner_backup_${localDateStr()}.json`;
            a.click(); URL.revokeObjectURL(url);
            showNotification('✅ Backup exported!');
        }

        function importBackup(input) {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data.tasks || !Array.isArray(data.tasks)) {
                        showNotification('❌ Invalid backup file', 'error'); return;
                    }
                    tasks              = data.tasks || [];
                    streak             = data.streak || 0;
                    lastCompletionDate = data.lastCompletionDate || null;
                    emailsEnabled      = data.emailsEnabled || false;
                    weeklyHistory      = data.weeklyHistory || {};
                    if (data.appSettings) {
                        appSettings = { ...appSettings, ...data.appSettings };
                        EMAIL_CONFIG.recipientEmail = appSettings.recipientEmail;
                        saveSettings();
                    }
                    saveState();
                    render();
                    updateWeekly();
                    renderHeatmap();
                    updateEmailUI();
                    document.getElementById('streakCount').textContent = streak + ' 🔥';
                    closeSettings();
                    showNotification(`✅ Restored ${tasks.length} tasks from backup!`);
                    input.value = '';
                } catch(err) {
                    showNotification('❌ Failed to read backup file', 'error');
                }
            };
            reader.readAsText(file);
        }

        // ────────────────────────────────────────────
        //  FIX 4: Save snapshot on page close/tab switch
        // ────────────────────────────────────────────
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') saveYesterdaySnapshot();
        });
        window.addEventListener('beforeunload', () => {
            saveYesterdaySnapshot();
        });

        // ────────────────────────────────────────────
        //  KEYBOARD SHORTCUTS
        // ────────────────────────────────────────────
        document.addEventListener('keydown', e => {
            const tag     = document.activeElement.tagName.toLowerCase();
            const inInput = ['input','textarea','select'].includes(tag);
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
                currentTaskId = null;
            }
            if (e.key === 'n' && !inInput) {
                e.preventDefault();
                document.getElementById('taskName').focus();
            }
            // FIX 13: Ctrl+Enter submits the add-task form from anywhere (including textarea)
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                const activeModal = document.querySelector('.modal.active');
                if (!activeModal) {
                    e.preventDefault();
                    document.getElementById('taskForm').requestSubmit();
                }
            }
        });

        // Start
        init();
        // FIX 6: removed duplicate updateWeekly() — init() already calls it via render()
        // FIX 10: removed duplicate streakCount set — init() → loadState() → streak already set