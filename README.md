# Finecity Landscape Backend V2

Backend service for Finecity Landscape management system, built with Node.js, Express, TypeScript, and MongoDB.

## Features
- **TypeScript**: Fully typed codebase for reliability.
- **Branch-First Architecture**: Multi-branch support (HQ, Dubai Branch, etc.).
- **Role-Based Access Control**: Admin and Employee roles.
- **Task Generation**: Automated care task scheduling.
- **Offline Sync**: Mobile app sync support.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create `.env` file based on your configuration (see `src/config/env.ts` for required variables).

3. **Database Migration (Important for V2)**
   If you have existing data, run the migration script to backfill branches, zones, and categories.
   ```bash
   npx tsx seeds/migration.ts
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## Project Structure
- `src/models`: Mongoose schemas (User, PlantBatch, CareTask, etc.)
- `src/controllers`: Request handlers
- `src/services`: Business logic
- `src/routes`: API route definitions
- `src/middleware`: Auth, validation, rate limiting
- `src/validators`: Joi validation schemas

## V2 Changes
- **Strict Typing**: All files converted to TypeScript.
- **New Models**: Branch, Category, Zone, PlantType, AuditLog.
- **Refs**: PlantBatch now uses references for Zone, Category, PlantType instead of strings.
