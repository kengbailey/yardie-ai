## ADDED Requirements

### Requirement: Multi-stage Dockerfile produces a minimal image
The Dockerfile SHALL use a multi-stage build:
1. **Build stage**: Install dependencies, build the Next.js standalone output
2. **Production stage**: Copy only the standalone output, public assets, and static files into a minimal `node:20-alpine` image

The final image SHALL NOT contain `node_modules`, source TypeScript files, or build tools.

#### Scenario: Docker build succeeds
- **WHEN** `docker build -t yardie-ai .` is executed from the project root
- **THEN** the build completes successfully and produces a runnable image

#### Scenario: Production image is minimal
- **WHEN** the final Docker image is inspected
- **THEN** it contains only the Next.js standalone server, public directory, and static assets (no node_modules, no .ts files, no dev dependencies)

### Requirement: Container serves the application on port 80
The Docker container SHALL listen on port 80 by default, mapping to the Next.js server running on port 3000 internally. The `PORT` environment variable SHALL be set to `3000` in the Dockerfile, and the container SHALL expose port 80 via port mapping.

#### Scenario: Container serves on port 80
- **WHEN** `docker run -p 80:3000 yardie-ai` is executed
- **THEN** the landing page is accessible at `http://localhost:80`

### Requirement: SQLite data persists via volume mount
The database file SHALL be stored at a configurable path (defaulting to `/data/emails.db`). The `DB_PATH` environment variable SHALL control the database file location. The `/data` directory SHALL exist in the container for volume mounting.

#### Scenario: Data persists across container restarts
- **WHEN** a container is started with `-v yardie-data:/data`, an email is submitted, the container is stopped and a new container is started with the same volume
- **THEN** the previously submitted email is still present in the database

#### Scenario: Default path works without volume
- **WHEN** a container is started without a volume mount
- **THEN** the database is created at `/data/emails.db` inside the container (data is ephemeral)

### Requirement: Next.js standalone output mode is configured
The `next.config.ts` SHALL set `output: 'standalone'` to produce a self-contained production server that does not require the full `node_modules` directory.

#### Scenario: Standalone output is generated
- **WHEN** `npm run build` is executed
- **THEN** a `.next/standalone` directory is created containing a self-contained `server.js` and minimal dependencies

### Requirement: GitHub Actions workflow builds the new Dockerfile
The `.github/workflows/build-and-push.yml` SHALL build the new Next.js Dockerfile and push to GitHub Container Registry (ghcr.io) on pushes to the `main` branch. The workflow structure (triggers, registry login, metadata, tags) SHALL remain the same as the current workflow.

#### Scenario: CI builds on push to main
- **WHEN** a commit is pushed to the `main` branch
- **THEN** the GitHub Actions workflow builds the Docker image and pushes it to `ghcr.io/<owner>/yardie-ai` with `latest` and SHA-based tags

### Requirement: better-sqlite3 native addon compiles in Docker
The build stage SHALL include the necessary build tools (`python3`, `make`, `g++`) for compiling the `better-sqlite3` native addon. The compiled addon SHALL carry over to the production stage without requiring build tools there.

#### Scenario: Native addon builds successfully
- **WHEN** `npm install` runs in the Docker build stage
- **THEN** `better-sqlite3` compiles its native addon without errors

#### Scenario: Production stage runs without build tools
- **WHEN** the production stage image runs
- **THEN** `better-sqlite3` works correctly despite `python3`, `make`, and `g++` not being installed in the production stage
