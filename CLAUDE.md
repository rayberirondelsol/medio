# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React TypeScript application created with Create React App. It's a standard single-page application setup with minimal customization from the default template.

## Development Commands

- `npm start` - Start development server on http://localhost:3000 with hot reload
- `npm test` - Run tests in interactive watch mode using Jest and React Testing Library
- `npm run build` - Create production build in the `build` folder
- `npm run eject` - Eject from Create React App (one-way operation)

## Architecture

- **Framework**: React 19.1.1 with TypeScript 4.9.5
- **Build Tool**: Create React App (react-scripts 5.0.1)
- **Testing**: Jest with React Testing Library (@testing-library/react)
- **Type Checking**: TypeScript with strict mode enabled
- **Linting**: ESLint with react-app configuration

## Project Structure

- `src/` - Source code directory
  - `App.tsx` - Main application component
  - `index.tsx` - Application entry point
  - `setupTests.ts` - Test configuration
  - `reportWebVitals.ts` - Web vitals reporting
- `public/` - Static assets served directly
- `tsconfig.json` - TypeScript configuration with strict mode

## Key Configuration

- TypeScript target: ES5 with modern lib support (DOM, ESNext)
- JSX: react-jsx (new transform)
- Module resolution: Node.js style
- Strict mode enabled for type checking

## Recent Features

### Add Video via Link (002-add-video-link) - 2025-10-17

**Status**: Planning Complete (Phase 1)
**Spec**: `specs/002-add-video-link/spec.md`
**Plan**: `specs/002-add-video-link/plan.md`

**What it adds**:
- URL parsing utilities for YouTube, Vimeo, Dailymotion (`src/utils/urlParser.ts`)
- Video metadata fetch service with backend proxy (`backend/src/services/youtubeService.js`)
- Platform UUID management endpoint (`GET /api/platforms`)
- Enhanced AddVideoModal component with auto-fill metadata
- Error boundaries for graceful error handling
- AbortController for request cancellation

**New Dependencies**:
- YouTube Data API v3 (requires `YOUTUBE_API_KEY` in backend/.env)
- Vimeo API (optional)
- Dailymotion API (public, no key required)

**Key Technologies**:
- Backend: Express.js, PostgreSQL, axios
- Frontend: React 19, TypeScript, React Context API
- Testing: Jest + React Testing Library + Playwright (TDD workflow)

**Constitution Compliance**: ✅ All 6 principles met
