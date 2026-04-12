## MODIFIED Requirements

### Requirement: Managers can adjust user budgets
When a manager updates a user's budget, the system SHALL call `POST /end_user/update` with the user's email and the new `max_budget`. The change SHALL take effect immediately.

#### Scenario: Budget update propagates to LiteLLM
- **WHEN** a manager sets alice's budget to $5.00
- **THEN** the system calls `/end_user/update` with `user_id: "alice@example.com"` and `max_budget: 5.0`
