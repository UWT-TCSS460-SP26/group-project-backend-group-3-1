# TCSS 460 — Group Project Backend

Express + TypeScript API for the TCSS 460 group project.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Start development server (auto-reloads on changes)
npm run dev
```

## Audience Structure

AUTH_ISSUER = group-N-api

The server starts at [https://group-project-backend-group-3-1.onrender.com](https://group-project-backend-group-3-1.onrender.com).

API documentation is at [https://group-project-backend-group-3-1.onrender.com/api-docs](https://group-project-backend-group-3-1.onrender.com/api-docs).

## Scripts

| Command               | Description                       |
| --------------------- | --------------------------------- |
| `npm run dev`         | Start dev server with auto-reload |
| `npm run build`       | Compile TypeScript to `dist/`     |
| `npm start`           | Run compiled output               |
| `npm test`            | Run tests                         |
| `npm run lint`        | Run ESLint                        |
| `npm run format`      | Format code with Prettier         |
| `npm run db:setup`    | Set up datebase                   |
| `npm run prisma:seed` | Seeds database with users         |

## Deployed URL

[https://group-project-backend-group-3-1.onrender.com]
