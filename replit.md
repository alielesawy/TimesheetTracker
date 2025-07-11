# Replit.md - Modern Timesheet Application

## Overview

This is a modern, minimalist timesheet application built with React + TypeScript frontend and Express + Node.js backend. The application provides time tracking functionality with both user and admin roles, featuring a clean UI with focus on usability and data visualization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Framework**: Radix UI components with Tailwind CSS styling
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom CSS variables for theming

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js with local strategy using session-based auth
- **Session Management**: Express sessions with PostgreSQL session store
- **Database**: PostgreSQL with Drizzle ORM
- **Password Security**: Node.js crypto module with scrypt hashing
- **Environment**: Development uses tsx for TypeScript execution, production uses compiled JavaScript

## Key Components

### Database Schema
- **Users**: Store user information including admin privileges (`isStaff` field)
- **Timesheets**: Daily time tracking records linked to users
- **Sessions**: Individual work sessions with start/end times
- **Notifications**: System notifications for users
- **Company Settings**: Configurable application settings

### Authentication System
- Session-based authentication using Passport.js
- Password hashing with scrypt and random salt
- Protected routes requiring authentication
- Role-based access control (admin vs regular users)

### Timer Functionality
- Central timer component with start/stop functionality
- Real-time timer display with elapsed time tracking
- Session management tied to daily timesheets
- Client-side timestamp capture for accuracy

### Data Visualization
- Timeline view showing work sessions as visual blocks
- Daily and monthly time summaries
- Interactive session editing for admins
- Real-time updates using React Query

## Data Flow

1. **User Authentication**: Login creates session, stored in PostgreSQL
2. **Timer Operations**: Start/stop actions create/update session records
3. **Data Fetching**: React Query manages server state with automatic caching
4. **Real-time Updates**: Polling intervals keep UI synchronized
5. **Admin Operations**: Separate admin routes for user management and session editing

## External Dependencies

### Frontend Dependencies
- **UI Components**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with class-variance-authority for component variants
- **Data Fetching**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Hookform Resolvers
- **Validation**: Zod for schema validation
- **Date Handling**: date-fns for date manipulation
- **Icons**: Lucide React for consistent iconography

### Backend Dependencies
- **Database**: Neon serverless PostgreSQL with connection pooling
- **ORM**: Drizzle ORM with Drizzle Kit for migrations
- **Authentication**: Passport.js with connect-pg-simple for session storage
- **Validation**: Zod for schema validation (shared with frontend)

## Deployment Strategy

- **Development**: Vite dev server for frontend, tsx for backend hot reloading
- **Build Process**: Vite builds frontend to `dist/public`, esbuild bundles backend to `dist/`
- **Production**: Single Node.js process serves both API and static files
- **Database**: Uses DATABASE_URL environment variable for PostgreSQL connection
- **Session Security**: Requires SESSION_SECRET environment variable

### Build Commands
- `npm run dev`: Development with hot reloading
- `npm run build`: Production build (frontend + backend)
- `npm run start`: Production server
- `npm run db:push`: Push database schema changes

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for session encryption
- `NODE_ENV`: Environment setting (development/production)

## Key Design Decisions

### Authentication Choice
- **Decision**: Session-based authentication with Passport.js
- **Rationale**: Simpler than JWT for this use case, good security with HttpOnly cookies
- **Alternative**: JWT tokens were considered but deemed unnecessary for this application scope

### Database ORM Selection
- **Decision**: Drizzle ORM with PostgreSQL
- **Rationale**: Type-safe queries, excellent TypeScript integration, lightweight
- **Alternative**: Prisma was considered but Drizzle offers better performance and smaller bundle size

### Frontend State Management
- **Decision**: TanStack Query for server state, React hooks for local state
- **Rationale**: Excellent caching, automatic refetching, optimistic updates
- **Alternative**: Redux was considered but overkill for this application's complexity

### UI Component Strategy
- **Decision**: Radix UI primitives with Tailwind CSS
- **Rationale**: Accessible by default, customizable, consistent design system
- **Alternative**: Headless UI was considered but Radix offers more comprehensive component set

### Real-time Updates
- **Decision**: Polling-based updates using React Query intervals
- **Rationale**: Simple implementation, reliable across different network conditions
- **Alternative**: WebSockets were considered but unnecessary for this application's update frequency