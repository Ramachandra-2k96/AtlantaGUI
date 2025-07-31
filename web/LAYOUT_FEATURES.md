# Layout System Features

## Overview
The Atalanta Web GUI features a VS Code-like layout system with resizable panels, responsive design, and comprehensive theming.

## Key Features

### 1. Resizable Panels
- **Sidebar Panel**: Collapsible file explorer with tabs (Explorer, Search, Git, Settings)
- **Main Editor Panel**: Primary content area with tabbed interface
- **Terminal Panel**: Collapsible bottom panel for terminal access
- **Right Panel**: Atalanta runner panel (desktop only)

### 2. Responsive Design
- **Desktop (≥768px)**: Full layout with all panels visible
- **Tablet (768px-1024px)**: Simplified layout, right panel hidden
- **Mobile (<768px)**: Overlay sidebar, single-column layout

### 3. VS Code-like Theming
- **Dark Theme**: Primary VS Code dark color scheme
- **Light Theme**: Optional light theme support
- **Custom Colors**: VS Code-inspired color palette
- **Consistent Typography**: Monospace fonts throughout

### 4. Keyboard Shortcuts
- **Ctrl/Cmd + B**: Toggle sidebar
- **Ctrl/Cmd + `**: Toggle terminal
- **Focus Management**: Proper focus handling for accessibility

### 5. Mobile Features
- **Hamburger Menu**: Mobile navigation
- **Overlay Sidebar**: Full-screen sidebar on mobile
- **Touch-Friendly**: Optimized for touch interactions
- **Responsive Breakpoints**: Adaptive layout at different screen sizes

### 6. Accessibility
- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Indicators**: Clear focus states
- **High Contrast**: Support for high contrast mode

## Component Structure

```
Layout
├── Mobile Header (mobile only)
├── Mobile Sidebar Overlay (mobile only)
├── Desktop Layout
│   ├── Sidebar Panel (collapsible)
│   │   └── Sidebar (with tabs)
│   │       ├── Explorer Tab
│   │       ├── Search Tab
│   │       ├── Git Tab
│   │       └── Settings Tab
│   └── Main Content Panel
│       ├── Editor Panel
│       │   ├── Tab Bar
│       │   └── Editor Content
│       └── Terminal Panel (collapsible)
│           ├── Terminal Header
│           └── Terminal Content
├── Collapsed Sidebar Toggle (when collapsed)
└── Collapsed Terminal Toggle (when collapsed)
```

## CSS Custom Properties

The layout uses CSS custom properties for theming:

- `--vscode-bg`: Main background color
- `--vscode-foreground`: Primary text color
- `--vscode-sidebar`: Sidebar background
- `--vscode-editor`: Editor background
- `--vscode-terminal`: Terminal background
- `--vscode-border`: Border color
- `--vscode-hover`: Hover state color
- `--vscode-accent`: Accent color for highlights

## Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: ≥ 1024px

## Panel Behavior

### Sidebar
- **Desktop**: Resizable, collapsible
- **Mobile**: Overlay with backdrop

### Terminal
- **All Devices**: Collapsible bottom panel
- **Mobile**: Full width when expanded

### Right Panel (Atalanta Runner)
- **Desktop**: Fixed width (320px)
- **Tablet/Mobile**: Hidden, accessible via mobile menu