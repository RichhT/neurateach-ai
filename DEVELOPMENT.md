# Neurateach Development Guide

## Quick Start

To avoid the common port conflicts and startup issues, follow these exact steps:

### 1. Kill any running processes
```bash
pkill -f "node.*server" && pkill -f nodemon && pkill -f vite && pkill -f concurrently
```

### 2. Start the application
```bash
npm run dev
```

The app will start:
- **Frontend**: http://localhost:3000/
- **Backend**: Port 5001

### 3. Access the application
- **Main page**: http://localhost:3000/
- **Teacher Portal**: http://localhost:3000/teacher.html
- **Student Portal**: http://localhost:3000/student.html

## Common Issues & Solutions

### Port Already in Use
If you get "EADDRINUSE" errors:

1. **Check what's using the ports:**
   ```bash
   lsof -i :3000
   lsof -i :5001
   ```

2. **Kill processes using those ports:**
   ```bash
   kill $(lsof -ti:3000)
   kill $(lsof -ti:5001)
   ```

3. **Restart the app:**
   ```bash
   npm run dev
   ```

### macOS Port 5000 Conflict
Port 5000 is used by macOS Control Center. The app is configured to use port 5001 instead.

### Frontend/Backend Connection Issues
The Vite proxy is configured in `frontend/vite.config.js` to route `/api/*` requests to `http://localhost:5001`.

## Environment Setup

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Add your OpenAI API key:**
   ```bash
   # Edit .env file
   OPENAI_API_KEY=your_actual_api_key_here
   ```

## Project Structure
```
neurateach/
├── frontend/          # React Vite app
│   ├── src/
│   │   ├── teacher/   # Teacher portal
│   │   ├── student/   # Student portal
│   │   └── shared/    # Shared components
│   ├── teacher.html   # Teacher entry point
│   └── student.html   # Student entry point
├── backend/           # Node.js Express API
│   ├── routes/        # API routes
│   ├── config/        # Database config
│   └── server.js      # Main server file
└── package.json       # Root scripts
```

## Available Scripts

- `npm run dev` - Start both frontend and backend
- `npm run dev:frontend` - Start only frontend
- `npm run dev:backend` - Start only backend
- `npm run install:all` - Install all dependencies

## Database
Uses SQLite database located at `backend/config/database.sqlite`.

## Deployment
The app is configured for Railway deployment with the included `railway.json` configuration.