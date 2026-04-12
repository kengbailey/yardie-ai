## ADDED Requirements

### Requirement: LiteLLM Proxy routes all LLM requests through OpenRouter
LiteLLM SHALL be configured as an OpenAI-compatible proxy with OpenRouter as the sole provider. All models SHALL be prefixed with `openrouter/` in the LiteLLM config. A single org-level OpenRouter API key SHALL be used.

#### Scenario: LLM request flows through proxy
- **WHEN** an OpenWebUI instance sends a chat completion request to LiteLLM
- **THEN** LiteLLM forwards it to OpenRouter and streams the response back

### Requirement: Per-user virtual keys with budgets
Each user SHALL have a LiteLLM virtual key with a `max_budget` in USD. New users start with $1. The portal manages keys via the LiteLLM Admin API.

#### Scenario: New user gets virtual key
- **WHEN** a user is provisioned
- **THEN** a LiteLLM virtual key is created with max_budget=$1 and assigned model allowlist

#### Scenario: Budget exhausted
- **WHEN** a user's remaining budget drops below $0.001
- **THEN** subsequent LLM requests return 429 with "Token budget exceeded"

### Requirement: Hybrid budget enforcement
The proxy SHALL pre-check budget before forwarding (reject if < $0.001 remaining), allow the stream to complete, extract actual usage from the final streaming chunk, and deduct actual cost. If budget is now exhausted, the next request SHALL be blocked.

#### Scenario: Pre-check passes, post-deduct exhausts budget
- **WHEN** a user with $0.01 remaining sends a request that costs $0.015
- **THEN** the request completes, budget goes to -$0.005, and the next request is blocked

### Requirement: Model access control per user
Each virtual key SHALL have an optional model allowlist. If set, only listed models can be used. Managers control this per-user via the portal, which calls the LiteLLM Admin API.

#### Scenario: User tries restricted model
- **WHEN** a user with allowlist ["meta-llama/llama-3.1-70b-instruct"] requests "anthropic/claude-3.5-sonnet"
- **THEN** the request is rejected with 403

### Requirement: Three subscription tiers
The system SHALL support Free, Standard, and Pro tiers with different rate limits. Specific limits for each tier SHALL be configurable. The portal stores the user's tier; LiteLLM enforces rate limits via virtual key parameters.

#### Scenario: Rate limit by tier
- **WHEN** a Free-tier user exceeds their RPM limit
- **THEN** subsequent requests return 429 until the rate window resets

### Requirement: Per-instance identification via API key
Each OpenWebUI instance SHALL use a unique LiteLLM API key. The proxy SHALL map the key to the instance for attribution and logging.

#### Scenario: Request attributed to instance
- **WHEN** an LLM request arrives with API key "sk-cornwall-xxx"
- **THEN** the proxy logs it as originating from the "cornwall" instance

### Requirement: Usage tracking in PostgreSQL
LiteLLM SHALL store usage data (user, model, tokens in/out, cost, timestamp) in its PostgreSQL database. The portal SHALL query this data for dashboard display.

#### Scenario: Usage data is queryable
- **WHEN** the portal requests usage stats for user "alice" this month
- **THEN** LiteLLM's database returns aggregated token counts and cost

### Requirement: Model pricing cache
LiteLLM SHALL refresh OpenRouter model pricing data twice per day for accurate pre-request cost estimation.

#### Scenario: Pricing data is current
- **WHEN** OpenRouter updates pricing for a model
- **THEN** LiteLLM's pricing cache reflects the change within 12 hours

### Requirement: Budget upgrades take effect within the hour
When a user's budget or tier is changed, the system SHALL update their LiteLLM virtual key within one hour. For immediate changes, the portal calls the LiteLLM Admin API directly.

#### Scenario: Immediate budget increase
- **WHEN** a manager increases a user's budget from $1 to $10 via the portal
- **THEN** the portal calls the LiteLLM Admin API and the change is effective immediately
