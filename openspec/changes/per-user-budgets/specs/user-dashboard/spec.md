## MODIFIED Requirements

### Requirement: Usage stats display
Budget info SHALL be sourced from the LiteLLM end_user record (`max_budget` and `spend`) instead of the shared instance key. Usage stats (tokens, conversations) SHALL match on the user's email in the `end_user` column of spend logs.

#### Scenario: Dashboard shows per-user budget
- **WHEN** alice has a $5.00 budget and has spent $2.30
- **THEN** the dashboard shows "Budget Remaining: $2.70 / $5.00"
