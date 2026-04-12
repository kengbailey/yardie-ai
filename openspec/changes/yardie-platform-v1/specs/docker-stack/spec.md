## ADDED Requirements

### Requirement: docker-compose runs the full stack locally
A `docker-compose.yml` SHALL define services for: portal (Next.js), litellm (LiteLLM Proxy), openwebui (test instance), postgres (PostgreSQL 16), and redis (Redis 7). All services SHALL be on a shared Docker network.

#### Scenario: Stack starts successfully
- **WHEN** `docker compose up` is run from the project root
- **THEN** all 5 services start and become healthy

### Requirement: PostgreSQL configured with separate databases
The postgres service SHALL create separate databases on startup: `portal_db`, `litellm_db`, `openwebui_test_db`. An init script SHALL create these databases automatically.

#### Scenario: Databases exist on startup
- **WHEN** the postgres container starts for the first time
- **THEN** all three databases are created and accessible

### Requirement: Traefik reverse proxy for subdomain routing
A Traefik service SHALL route traffic: `localhost` → portal, `test.localhost` → openwebui, with LiteLLM accessible internally on the Docker network only.

#### Scenario: Subdomain routing works
- **WHEN** a browser navigates to `http://test.localhost`
- **THEN** Traefik routes the request to the OpenWebUI test instance

### Requirement: Environment configuration via .env file
Sensitive configuration (OpenRouter API key, database passwords, Resend API key, Better Auth secret) SHALL be loaded from a `.env` file. A `.env.example` SHALL document all required variables.

#### Scenario: Stack configured via .env
- **WHEN** a developer copies `.env.example` to `.env` and fills in values
- **THEN** `docker compose up` starts with the correct configuration

### Requirement: Volume persistence for databases
PostgreSQL and Redis data SHALL be stored in named Docker volumes so data persists across container restarts.

#### Scenario: Data persists across restarts
- **WHEN** `docker compose down` and `docker compose up` are run
- **THEN** all database data and Redis state is preserved

### Requirement: Health checks on all services
Each service SHALL define a Docker health check. The portal, LiteLLM, and OpenWebUI SHALL check their HTTP endpoints. PostgreSQL SHALL use `pg_isready`. Redis SHALL use `redis-cli ping`.

#### Scenario: Unhealthy service detected
- **WHEN** the LiteLLM service fails its health check
- **THEN** Docker marks it as unhealthy and dependent services wait for recovery
