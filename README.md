# Horizon Portal — GrowMar Aura Workforce

A responsive workforce portal developed as part of the GrowMar Aura Workforce training project.

## Project Overview

Horizon Portal is a Next.js application designed to provide a foundation for a workforce management system, including a design system, database integration, authentication, role-based access, application navigation, and an employee directory.

## Technology Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite (local development database)
- Next.js API routes
- Lucide React
- next-themes

## Phase 1 Tasks

### Task 1 — UI Foundation and Design System
- Application foundation and responsive layout
- Centralised design tokens
- Reusable UI components
- Light and dark theme support
- Design showcase page

### Task 2 — Database and Employee API
- Prisma database integration
- Database schema and employee data
- Employee API foundation
- Seed and validation improvements

### Task 3 — Authentication and Role Login
- Login interface and authentication flow
- Role-aware access and navigation
- Session handling and authentication-related UI

### Task 4 — Application Shell and UI States
- Main portal navigation
- Sidebar and responsive layout
- Application interface and UI states
- Theme support

### Task 5 — Employee Directory
- Employee directory interface
- Employee listing and related UI
- Directory integration with the portal

Refer to the source code and screenshots for the implementation details of each task.

## Screenshots

The repository contains screenshots organised by task:

- `Task1_Screenshots/`
- `Task2_Screenshots/`
- `Task3_Screenshots/`
- `Task4_Screenshots/`
- `Task5_Screenshots/`

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- Git
- VS Code (recommended)

### Installation

Clone the repository:

```bash
git clone https://github.com/NavaneethaSelvam/horizon-portal.git
cd horizon-portal
```

Install dependencies:

```bash
npm install
```

On Windows PowerShell, if script execution blocks npm, use:

```powershell
npm.cmd install
```

### Environment Configuration

Review `.env.example` and configure any required local environment variables. Do not commit `.env` files containing credentials, secrets, or private configuration.

### Database Setup

Review the Prisma schema and project scripts in `package.json` before running database commands. Follow the setup instructions applicable to the current database configuration.

### Run the Development Server

```bash
npm run dev
```

On Windows PowerShell:

```powershell
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality Checks

Run linting:

```bash
npm.cmd run lint
```

Run a production build:

```bash
npm.cmd run build
```

Run the TypeScript check:

```bash
npx.cmd tsc --noEmit
```

Run these checks in your local environment and review the output before reporting the results.

## Repository

GitHub: https://github.com/NavaneethaSelvam/horizon-portal

Default branch: `main`

Repository visibility: Public

## Security Notes

- Never commit passwords, access tokens, API keys, or production credentials.
- Keep local `.env` files out of version control.
- Use mock or appropriately sanitised data for demonstrations.
- Review authentication and authorisation before using the application with real employee information.

## Project Status

Phase 1 implementation work and task screenshots are maintained in this repository. Refer to the source code, commits, and task screenshots for implementation evidence.

**Note:** Features and verification status should be confirmed against the current source code and local test results before production use.
