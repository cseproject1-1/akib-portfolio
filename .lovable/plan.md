

# AkibOS — Real OS Features Enhancement

## Overview
Transform AkibOS from a visual demo into a functional web OS with persistent state, a real virtual filesystem, interconnected apps, and interactive system controls.

## Features

### 1. Virtual Filesystem (localStorage-backed)
Create a real in-memory filesystem that persists to localStorage. All apps (File Manager, Text Editor, Terminal) share this filesystem.
- `src/lib/virtual-fs.ts` — VFS class with `readFile`, `writeFile`, `mkdir`, `ls`, `rm`, `stat`, `readDir`
- Pre-seeded with `/home/akib/Documents/`, `/home/akib/Pictures/`, `/home/akib/Downloads/`, default files
- All file operations persist to localStorage

### 2. File Manager — Real CRUD Operations
Rewrite `AppFileManager.tsx` to use the VFS:
- Browse folders, view files (grid + list view toggle)
- Create new folder / new file via toolbar buttons
- Rename files (double-click name)
- Delete files (right-click context menu or Delete key)
- Open `.txt` files in Text Editor (launches the app with file content)
- Breadcrumb navigation bar showing current path
- File size and modified date display

### 3. Text Editor — Open/Save Files
Rewrite `AppTextEditor.tsx` to integrate with VFS:
- Open files from File Manager or via File > Open dialog
- Save files to VFS (Ctrl+S shortcut)
- Save As dialog to choose path/name
- Tab support for multiple open files
- Unsaved changes indicator (dot on tab)
- Syntax highlighting for basic formats (optional)

### 4. Terminal — Real Filesystem Commands
Upgrade `AppTerminal.tsx` to operate on the VFS:
- `ls`, `cd`, `pwd` work against the real VFS
- `cat` reads file contents, `touch` creates files, `mkdir` creates directories
- `rm` deletes files, `cp`/`mv` for copy/move
- `echo "text" > file.txt` writes to files
- Working directory tracking (`cd` changes it)
- Tab completion for file/folder names

### 5. System Tray — Interactive Controls
Make the Wifi, Volume, Battery icons functional:
- **Volume**: Click opens a slider popup, value persists, affects click sound volume
- **Wifi**: Click toggles "connected/disconnected" with animation
- **Battery**: Shows a slowly decreasing percentage (resets on "charge" toggle)
- Each popup styled as a small floating panel

### 6. Settings — More Panels
Add new settings sections in `AppSettings.tsx`:
- **Appearance**: Dark/light accent color picker (changes `--os-accent`)
- **User**: Change display name (reflected on lock screen, terminal `whoami`)
- **Storage**: Show VFS usage stats (files count, total size)
- **Keyboard Shortcuts**: Reference list of all shortcuts

### 7. Start Menu — Search & Categories
Upgrade `StartMenu.tsx`:
- Search bar at top that filters apps by name/description
- Categorized sections: "Pinned", "All Apps"
- Recent apps section (tracks last 3 opened apps)
- Power button area: "Lock Screen", "Refresh" options

### 8. Clipboard System
- `Ctrl+C` / `Ctrl+V` within Text Editor and Terminal
- Copy file paths in File Manager
- Internal clipboard state shared across apps

### 9. App Communication via Event Bus
- `src/lib/event-bus.ts` — simple pub/sub for inter-app events
- File Manager can "Open With" Text Editor
- Terminal `open` command launches apps
- Double-clicking a `.txt` in File Manager opens it in Text Editor

## Technical Approach

| Area | Files |
|---|---|
| Virtual Filesystem | New `src/lib/virtual-fs.ts` |
| Event Bus | New `src/lib/event-bus.ts` |
| File Manager rewrite | `AppFileManager.tsx` |
| Text Editor rewrite | `AppTextEditor.tsx` |
| Terminal upgrade | `AppTerminal.tsx` |
| System Tray popups | `Taskbar.tsx`, new `SystemTrayPopup.tsx` |
| Settings expansion | `AppSettings.tsx` |
| Start Menu upgrade | `StartMenu.tsx` |
| Window Manager | `useWindowManager.ts` (add openWindow with initial data/props) |
| Desktop | `Desktop.tsx` (wire event bus, pass file open callbacks) |

All state persists in localStorage. No backend needed. Existing styling and animation patterns preserved.

