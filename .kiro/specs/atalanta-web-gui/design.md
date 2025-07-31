# Design Document

## Overview

The Atalanta Web GUI is a comprehensive web-based interface that transforms the legacy CLI-only Atalanta circuit debugging tool into a modern, user-friendly application. The solution combines a Next.js frontend with the existing C++ Atalanta binary in a single Docker container, providing a VS Code-like experience for circuit designers.

The architecture follows a client-server model where the Next.js application serves as both the web server and API layer, communicating with the Atalanta CLI through child processes and file system operations. The entire solution is containerized with persistent storage to ensure zero-configuration deployment.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Docker Container"
        subgraph "Next.js Application"
            WEB[Web Server :3000]
            API[API Routes]
            FS[File System API]
            TERM[Terminal API]
        end
        
        subgraph "Backend Services"
            ATALANTA[Atalanta Binary]
            BASH[Bash Shell]
            FILES[File System]
        end
        
        subgraph "Storage"
            VOLUME[Named Docker Volume]
            WORKSPACE[/workspace]
        end
    end
    
    USER[User Browser] --> WEB
    WEB --> API
    API --> FS
    API --> TERM
    TERM --> BASH
    FS --> ATALANTA
    BASH --> ATALANTA
    FILES --> VOLUME
    WORKSPACE --> VOLUME
```

### Container Architecture

The Docker container extends the existing Atalanta setup with the following layers:

1. **Base Layer**: Ubuntu 20.04 with Atalanta binary and dependencies
2. **Node.js Layer**: Node.js 18+ runtime for Next.js application
3. **Application Layer**: Next.js web application with API routes
4. **Storage Layer**: Named volume mounted at `/workspace` for persistence

### Technology Stack

- **Frontend**: Next.js 14 with React 18, TypeScript
- **UI Framework**: Tailwind CSS with Headless UI components
- **Terminal**: xterm.js with node-pty for terminal emulation
- **File Management**: Monaco Editor for code editing with custom .bench syntax
- **Real-time Communication**: WebSockets for terminal and file watching
- **Process Management**: Node.js child_process for Atalanta execution
- **Container**: Docker with multi-stage build for optimization

## Components and Interfaces

### Frontend Components

#### 1. Layout Manager (`components/Layout.tsx`)
- **Purpose**: Main application shell with resizable panels
- **Props**: `children`, `initialLayout`
- **State**: Panel sizes, visibility, active tabs
- **Features**: Drag-to-resize panels, collapsible sidebar, responsive breakpoints

#### 2. File Explorer (`components/FileExplorer.tsx`)
- **Purpose**: VS Code-like file tree navigation
- **Props**: `rootPath`, `onFileSelect`, `onFileCreate`
- **State**: Expanded folders, selected files, context menu
- **Features**: Lazy loading, drag-and-drop, context menus, file icons

#### 3. Code Editor (`components/CodeEditor.tsx`)
- **Purpose**: Monaco-based editor with .bench syntax highlighting
- **Props**: `file`, `content`, `onChange`, `readOnly`
- **State**: Editor instance, syntax highlighting, auto-completion
- **Features**: Custom .bench language definition, error highlighting, auto-save

#### 4. Terminal Panel (`components/Terminal.tsx`)
- **Purpose**: Integrated terminal using xterm.js
- **Props**: `sessionId`, `onCommand`, `initialDirectory`
- **State**: Terminal instance, session state, command history
- **Features**: Multiple sessions, command completion, copy/paste support

#### 5. Atalanta Runner (`components/AtlantaRunner.tsx`)
- **Purpose**: GUI interface for common Atalanta operations
- **Props**: `selectedFile`, `onExecute`, `onComplete`
- **State**: Execution status, parameters, output streams
- **Features**: Parameter forms, progress tracking, output parsing

#### 6. Results Viewer (`components/ResultsViewer.tsx`)
- **Purpose**: Enhanced display for Atalanta output files
- **Props**: `fileType`, `content`, `statistics`
- **State**: Parsed data, view mode, filters
- **Features**: Tabular display, syntax highlighting, export options

### Backend API Routes

#### 1. File System API (`/api/fs/`)
```typescript
// GET /api/fs/list?path=/workspace
interface ListResponse {
  files: FileInfo[];
  directories: DirectoryInfo[];
}

// POST /api/fs/create
interface CreateRequest {
  path: string;
  type: 'file' | 'directory';
  content?: string;
}

// PUT /api/fs/update
interface UpdateRequest {
  path: string;
  content: string;
}

// DELETE /api/fs/delete
interface DeleteRequest {
  path: string;
}
```

#### 2. Terminal API (`/api/terminal/`)
```typescript
// WebSocket connection for terminal sessions
interface TerminalMessage {
  type: 'input' | 'output' | 'resize' | 'create' | 'destroy';
  sessionId: string;
  data: string | { cols: number; rows: number };
}
```

#### 3. Atalanta Execution API (`/api/atalanta/`)
```typescript
// POST /api/atalanta/execute
interface ExecuteRequest {
  inputFile: string;
  parameters: AtlantaParameters;
  outputDirectory: string;
}

interface ExecuteResponse {
  jobId: string;
  status: 'running' | 'completed' | 'failed';
  output?: string;
  error?: string;
}

// GET /api/atalanta/status/:jobId
interface StatusResponse {
  status: 'running' | 'completed' | 'failed';
  progress?: number;
  output: string;
  error?: string;
}
```

#### 4. Project Management API (`/api/projects/`)
```typescript
// GET /api/projects/recent
interface RecentProject {
  name: string;
  path: string;
  lastAccessed: string;
}

// POST /api/projects/create
interface CreateProjectRequest {
  name: string;
  path: string;
  template?: string;
}
```

### Data Models

#### File System Models
```typescript
interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
  type: 'file';
  extension: string;
}

interface DirectoryInfo {
  name: string;
  path: string;
  type: 'directory';
  children?: (FileInfo | DirectoryInfo)[];
}
```

#### Atalanta Models
```typescript
interface AtlantaParameters {
  backtrackLimit1?: number;
  backtrackLimit2?: number;
  compactionMode?: 'none' | 'reverse' | 'shuffle';
  randomSeed?: number;
  fillMode?: '0' | '1' | 'x' | 'r';
  logMode?: boolean;
  faultMode?: 'default' | 'file';
  faultFile?: string;
}

interface AtlantaResult {
  inputFile: string;
  outputFiles: {
    test?: string;
    vec?: string;
    log?: string;
  };
  statistics: {
    gates: number;
    inputs: number;
    outputs: number;
    faults: number;
    detected: number;
    coverage: number;
    patterns: number;
    runtime: number;
  };
}
```

## Error Handling

### Frontend Error Handling
1. **Global Error Boundary**: Catches React component errors and displays user-friendly messages
2. **API Error Handling**: Standardized error responses with user-actionable messages
3. **File Operation Errors**: Specific handling for permission, disk space, and file format errors
4. **Terminal Errors**: Connection loss recovery and session restoration

### Backend Error Handling
1. **Process Execution Errors**: Proper handling of Atalanta binary failures with detailed logging
2. **File System Errors**: Permission checks and disk space monitoring
3. **WebSocket Errors**: Connection management and automatic reconnection
4. **Container Health**: Health check endpoints for monitoring container status

### Error Recovery Strategies
1. **Automatic Retry**: For transient network and file system errors
2. **Graceful Degradation**: Fallback to read-only mode when write operations fail
3. **State Recovery**: Restore editor and terminal state after errors
4. **User Notification**: Clear error messages with suggested actions

## Testing Strategy

### Unit Testing
- **Frontend Components**: Jest + React Testing Library for component behavior
- **API Routes**: Jest for API endpoint testing with mocked file system
- **Utility Functions**: Comprehensive testing of file parsing and Atalanta parameter handling

### Integration Testing
- **File Operations**: End-to-end testing of file CRUD operations
- **Terminal Integration**: Testing terminal session management and command execution
- **Atalanta Execution**: Testing complete workflow from file selection to result display

### Container Testing
- **Docker Build**: Automated testing of container build process
- **Health Checks**: Verification of container startup and service availability
- **Volume Persistence**: Testing data persistence across container restarts

### Performance Testing
- **Large File Handling**: Testing with large .bench files and output files
- **Concurrent Users**: Testing multiple terminal sessions and file operations
- **Memory Usage**: Monitoring container resource usage under load

### Browser Compatibility Testing
- **Cross-browser**: Testing on Chrome, Firefox, Safari, Edge
- **Mobile Devices**: Responsive design testing on various screen sizes
- **Accessibility**: WCAG compliance testing for keyboard navigation and screen readers

## Security Considerations

### Container Security
1. **Non-root User**: Run application processes as non-privileged user
2. **File System Isolation**: Restrict file access to workspace directory
3. **Resource Limits**: Set memory and CPU limits to prevent resource exhaustion

### Web Application Security
1. **Input Validation**: Sanitize all file paths and command inputs
2. **CSRF Protection**: Implement CSRF tokens for state-changing operations
3. **Content Security Policy**: Strict CSP headers to prevent XSS attacks
4. **File Upload Security**: Validate file types and scan for malicious content

### API Security
1. **Rate Limiting**: Prevent abuse of API endpoints
2. **Path Traversal Protection**: Validate and sanitize file paths
3. **Command Injection Prevention**: Sanitize all inputs to shell commands
4. **Session Management**: Secure terminal session isolation

## Performance Optimizations

### Frontend Optimizations
1. **Code Splitting**: Lazy load components and routes
2. **Virtual Scrolling**: For large file lists and terminal output
3. **Debounced Operations**: File saving and search operations
4. **Caching**: Browser caching for static assets and API responses

### Backend Optimizations
1. **File Watching**: Efficient file system monitoring with debouncing
2. **Process Pooling**: Reuse terminal sessions and processes where possible
3. **Streaming**: Stream large file contents and command output
4. **Compression**: Gzip compression for API responses

### Container Optimizations
1. **Multi-stage Build**: Minimize final image size
2. **Layer Caching**: Optimize Dockerfile for build caching
3. **Resource Allocation**: Appropriate memory and CPU limits
4. **Volume Optimization**: Efficient volume mounting and access patterns