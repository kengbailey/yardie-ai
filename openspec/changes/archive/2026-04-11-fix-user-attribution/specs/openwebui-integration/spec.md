## MODIFIED Requirements

### Requirement: User attribution via built-in Functions
Each OpenWebUI instance SHALL have a globally-active Filter Function deployed that injects user identity into the `user` field of the request body (a standard OpenAI API field) before it reaches LiteLLM. The value SHALL be formatted as `{user_id}::{user_email}::{instance_id}`. The function uses the `__user__` context provided by OpenWebUI.

#### Scenario: User identity injected into request
- **WHEN** user "alice" (id: abc123, email: alice@example.com) sends a chat message on the "cornwall" instance
- **THEN** the LLM request body includes `user: "abc123::alice@example.com::cornwall"`

#### Scenario: LiteLLM captures attribution
- **WHEN** a request with `user: "abc123::alice@example.com::cornwall"` reaches LiteLLM
- **THEN** the `end_user` column in `LiteLLM_SpendLogs` contains `"abc123::alice@example.com::cornwall"`

#### Scenario: Deploy script activates function
- **WHEN** the deploy script runs against an OpenWebUI instance
- **THEN** the function is created, toggled active, toggled global, and valves are configured with the instance_id
