## ADDED Requirements

### Requirement: OpenWebUI instances point to LiteLLM as their LLM backend
Each OpenWebUI instance SHALL be configured with `OPENAI_API_BASE_URLS` pointing to the LiteLLM proxy and `OPENAI_API_KEYS` set to the instance's unique LiteLLM API key.

#### Scenario: OpenWebUI sends request to LiteLLM
- **WHEN** a user chats in cornwall.yardie.ai
- **THEN** the LLM request is sent to the LiteLLM proxy (not directly to OpenRouter)

### Requirement: User attribution via built-in Functions
Each OpenWebUI instance SHALL have a globally-active Filter Function deployed that injects `user_id`, `user_email`, and `instance_id` into the request body's `metadata` field before it reaches LiteLLM. The function uses the `__user__` context provided by OpenWebUI.

#### Scenario: User identity injected into request
- **WHEN** user "alice" (id: abc123) sends a chat message on the "cornwall" instance
- **THEN** the LLM request body includes `metadata: { user_id: "abc123", user_email: "alice@example.com", instance_id: "cornwall" }`

### Requirement: Self-registration disabled on all instances
Each OpenWebUI instance SHALL set `ENABLE_SIGNUP=false`. User accounts SHALL only be created via the admin API as part of the provisioning pipeline.

#### Scenario: Direct signup blocked
- **WHEN** someone navigates to cornwall.yardie.ai and tries to sign up
- **THEN** no signup form is available; they see only the login form

### Requirement: OpenWebUI version pinned
All instances SHALL run the same pinned version of OpenWebUI specified in the docker-compose configuration. Version upgrades SHALL be tested before deployment.

#### Scenario: Version consistency
- **WHEN** a new OpenWebUI instance is deployed
- **THEN** it uses the same image tag as all other instances

### Requirement: Model filtering enabled per instance
Each instance SHALL have `ENABLE_MODEL_FILTER=true` with a `MODEL_FILTER_LIST` restricting visible models to those configured for that instance's tier.

#### Scenario: Users only see allowed models
- **WHEN** a user on a Free-tier instance opens the model selector in OpenWebUI
- **THEN** they only see models included in the instance's model filter list

### Requirement: Each instance has its own PostgreSQL database
OpenWebUI instances SHALL be configured with `DATABASE_URL` pointing to their own dedicated database (e.g., `openwebui_cornwall_db`) on the shared PostgreSQL server.

#### Scenario: Data isolation between instances
- **WHEN** user "alice" on cornwall creates a chat
- **THEN** that chat is only visible in the cornwall database, not in middlesex
