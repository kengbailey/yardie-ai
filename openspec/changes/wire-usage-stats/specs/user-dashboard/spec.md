## MODIFIED Requirements

### Requirement: Usage stats display
The dashboard SHALL display real usage data from LiteLLM: total tokens used (current month), number of LLM requests (current month), budget remaining (USD), and subscription tier. Data SHALL be queried on page load from the LiteLLM database.

#### Scenario: User with usage views dashboard
- **WHEN** a user who has sent 5 chat messages this month views their dashboard
- **THEN** they see the actual token count, request count, and spend deducted from budget

#### Scenario: User with no usage views dashboard
- **WHEN** a new user with no chat history views their dashboard
- **THEN** they see 0 tokens, 0 conversations, and full budget remaining

#### Scenario: Usage resets monthly
- **WHEN** a new month begins
- **THEN** the dashboard shows 0 tokens and 0 conversations for the new month (budget does not reset — it's a total allocation)
