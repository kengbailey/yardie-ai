## MODIFIED Requirements

### Requirement: Managers can adjust user budgets
Managers SHALL be able to increase or decrease a user's monthly budget. When the user has a personal LiteLLM virtual key, the change SHALL propagate to LiteLLM via the Admin API immediately. When using a shared instance key, the budget SHALL be stored in the portal database for future use.

#### Scenario: Budget update with personal key
- **WHEN** a manager sets a user's budget and the user has a LiteLLM virtual key
- **THEN** the system calls LiteLLM `updateVirtualKey` with the new `max_budget`

#### Scenario: Budget update without personal key
- **WHEN** a manager sets a user's budget but the user shares the instance key
- **THEN** the budget is stored in the portal database and a log entry notes that LiteLLM sync is pending

### Requirement: Managers can assign model access
Managers SHALL be able to control which models a user can access. When the user has a personal LiteLLM virtual key, the model allowlist SHALL propagate to LiteLLM immediately.

#### Scenario: Model update with personal key
- **WHEN** a manager updates a user's model list and the user has a LiteLLM virtual key
- **THEN** the system calls LiteLLM `updateVirtualKey` with the new `models` list
