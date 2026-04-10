# 📁 Project Structure Guide

## Directory Overview

```
Task_Tracker/
├── 📄 index.html              ← Main entry point (OPEN THIS FILE)
├── 🎨 modern.css              ← Professional modern styling (v2.0)
├── 🎨 styles.css              ← Legacy CSS (backup)
├── 📝 script.js               ← React application core logic
├── 📋 README.md               ← Project documentation
├── 📋 IMPROVEMENTS_REPORT.md  ← Detailed changelog & improvements
├── 📋 PROJECT_STRUCTURE.md    ← This file
├── 🐍 split.py                ← Python utility script
├── .gitignore                 ← Git ignore rules
└── 📁 temp/                   ← Temporary/backup files
    ├── index.html
    ├── script.js
    └── styles.css
```

---

## 📄 File Descriptions

### Core Files

#### `index.html` (400 bytes)
**Purpose**: Main HTML entry point
**Contains**:
- DOCTYPE and meta tags
- Responsive viewport configuration
- React CDN imports
- Root div for React mounting
- Script tags for external libraries

**Usage**: Open this file in a web browser to launch the application

#### `modern.css` (30 KB) - ⭐ NEW
**Purpose**: Professional modern design system
**Includes**:
- CSS custom properties (variables)
- Dark mode support
- Responsive breakpoints
- Component styles:
  - Cards and containers
  - Buttons and inputs
  - Forms and modals
  - Task items and lists
  - Charts and analytics
  - Notifications and alerts
- Animations and transitions

**Key Features**:
- Gradient color scheme (Indigo & Purple)
- Mobile-first responsive design
- Smooth transitions
- Accessibility support

#### `script.js` (25 KB)
**Purpose**: React application logic
**Contains**:
- React component: `App()`
- State management
- Task CRUD operations
- Chart rendering
- Email integration
- LocalStorage operations
- Timer functionality

**Key Functions**:
```javascript
- addTask()           // Create new task
- updateTask()        // Modify task
- deleteTask()        // Remove task
- completeTask()      // Mark complete
- toggleTaskTimer()   // Start/pause timer
- sendEmailSummary()  // Send email reports
- toggleTheme()       // Dark/light mode
```

#### `styles.css` (45 KB) - Legacy
**Purpose**: Backup styling (compatibility)
**Status**: Deprecated, use `modern.css` instead
**Remains**: For version control and fallback

#### `README.md` (Comprehensive)
**Purpose**: Project documentation
**Sections**:
- Features overview
- Quick start guide
- Usage instructions
- Technology stack
- Design system
- Troubleshooting
- Contributing guidelines

#### `IMPROVEMENTS_REPORT.md`
**Purpose**: Detailed changelog
**Contains**:
- Version history
- New features per version
- Bug fixes
- Performance improvements
- Design enhancements

---

## 🗂️ Temporary Files (temp/ directory)

Contains backup versions of core files for recovery purposes.

| File | Purpose |
|------|---------|
| `temp/index.html` | Backup HTML |
| `temp/script.js` | Backup React code |
| `temp/styles.css` | Backup styles |

**Note**: These are for backup only. Always use main root files.

---

## 🔧 Utility Files

#### `split.py`
**Purpose**: Python utility script
**Status**: Optional helper

#### `.gitignore`
**Purpose**: Git repository rules
**Excludes**: node_modules, .env, temp files, OS files

---

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────┐
│          Browser Runs index.html                    │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│    React App (script.js) Initializes                │
│    ├─ Loads CSS (modern.css)                        │
│    ├─ Reads from LocalStorage                       │
│    └─ Renders UI Components                         │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    ┌────────┐  ┌──────────┐  ┌──────────┐
    │ Header │  │  Forms   │  │ Analytics│
    └────────┘  └──────────┘  └──────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
        ┌─────────────▼──────────────┐
        │  Task List & Management    │
        │  ├─ Tasks                  │
        │  ├─ Timers                 │
        │  └─ Filters                │
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────┐
        │  LocalStorage (Persistence)│
        │  ├─ tasks[]                │
        │  ├─ appSettings            │
        │  └─ emailEnabled           │
        └────────────────────────────┘
```

---

## 🎨 Component Structure

### Main Components (in script.js)

1. **App Component**
   - State management
   - Main layout
   - Route handling (if needed)

2. **Sub-Components** (rendered by App):
   - Header (title, stats, settings)
   - Progress Section
   - Weekly Analytics
   - Heatmap (monthly activity)
   - Form Section (add new task)
   - Task List (display tasks)
   - Modals (edit, settings)
   - Notifications
   - Undo Bar

---

## 📦 Dependencies & CDN Links

| Library | Version | Purpose |
|---------|---------|---------|
| React | 18 | UI Framework |
| ReactDOM | 18 | DOM Rendering |
| Babel | Latest | JSX Transpilation |
| Chart.js | 3.9.1 | Charts & Graphs |
| EmailJS | 4 | Email Service |

**Access**: All via CDN (no npm install needed)

---

## 🌐 Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully Supported |
| Firefox | 88+ | ✅ Fully Supported |
| Safari | 14+ | ✅ Fully Supported |
| Edge | 90+ | ✅ Fully Supported |
| IE 11 | - | ❌ Not Supported |

---

## 💾 LocalStorage Structure

```javascript
// tasks
localStorage.getItem('tasks') 
→ JSON array of task objects

// appSettings
localStorage.getItem('appSettings')
→ {
    theme: "light" | "dark",
    sound: "on" | "off",
    startTime: "HH:mm",
    recipientEmail: "email@example.com"
  }

// emailEnabled
localStorage.getItem('emailEnabled')
→ true | false
```

---

## 🚀 Getting Started

### 1. First Time Setup
```bash
# Clone repository
git clone https://github.com/Harshit10880/Task_Tracker.git
cd Task_Tracker

# Open in browser
open index.html
# or
start index.html
# or
xdg-open index.html
```

### 2. With Local Server
```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# Then visit: http://localhost:8000
```

### 3. Configuration
- Email: Add in Settings (⚙️ icon)
- Theme: Toggle in header
- Preferences: Manage in Settings

---

## 🔍 Development Guide

### Adding a New Feature
1. Edit `script.js` (React logic)
2. Add CSS to `modern.css`
3. Test in browser
4. Commit and push

### Project as NPM Package
```bash
# If converting to Node.js project:
npm init -y
npm install react react-dom chart.js @emailjs/browser
```

### Version Control Workflow
```bash
# Make changes
git add .
git commit -m "feat: description"
git push origin main

# Also push to temp branch
git checkout temp
git merge main
git push origin temp
```

---

## 📈 Performance Metrics

| Metric | Value |
|--------|-------|
| Load Time | <2 seconds |
| Bundle Size | ~80 KB (with React CDN) |
| Memory Usage | <50 MB |
| CSS Size | 30 KB |
| JS Size | 25 KB |

---

## 🔐 Security Checklist

- ✅ No backend server (no data sent to servers)
- ✅ All data stored locally
- ✅ EmailJS only when explicitly enabled
- ✅ No tracking or analytics
- ✅ No account/login required

---

## 📞 Support & Troubleshooting

**Issue**: Tasks not loading
- **Solution**: Check LocalStorage in DevTools

**Issue**: CSS not applying
- **Solution**: Ensure modern.css is linked in head

**Issue**: React not rendering
- **Solution**: Check console for errors, verify React CDN

---

## 🎓 Learning Resources

- [React Documentation](https://react.dev)
- [Chart.js Guide](https://www.chartjs.org)
- [MDN Web Docs](https://developer.mozilla.org)

---

## 📝 Version Info

- **Current Version**: 2.0
- **Last Updated**: April 11, 2026
- **Status**: Production Ready ✅

---

**Happy Developing! 🚀**
