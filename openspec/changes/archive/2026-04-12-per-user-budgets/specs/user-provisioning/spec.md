## MODIFIED Requirements

### Requirement: Automated provisioning pipeline on instance assignment
When a user is assigned to an instance, the system SHALL also create a LiteLLM end_user record via `POST /end_user/new` with `user_id` set to the user's email, `max_budget` set to $1.00, and `budget_duration` set to "monthly".

#### Scenario: End_user created during provisioning
- **WHEN** sysadmin assigns user "alice@example.com" to instance "cornwall"
- **THEN** a LiteLLM end_user record is created with `user_id: "alice@example.com"`, `max_budget: 1.0`, `budget_duration: "monthly"`

#### Scenario: Budget enforced after provisioning
- **WHEN** alice chats and her spend reaches $1.00
- **THEN** LiteLLM returns a 400 error blocking further requests
