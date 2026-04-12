## ADDED Requirements

### Requirement: Automated provisioning pipeline on instance assignment
When a sysadmin or manager assigns a user to an instance, the system SHALL automatically: (1) create the user's account in the OpenWebUI instance via admin API, (2) create a LiteLLM virtual key with default budget ($1), and (3) send a welcome email via Resend with the instance URL and login credentials.

#### Scenario: Successful provisioning
- **WHEN** sysadmin assigns user "alice" (alice@example.com) to instance "cornwall"
- **THEN** alice's OpenWebUI account is created, a LiteLLM virtual key is generated, and she receives a welcome email with a link to cornwall.yardie.ai

### Requirement: Provisioning retry queue
If any step of provisioning fails (OpenWebUI API down, LiteLLM unreachable), the task SHALL be queued in a `provisioning_tasks` table with exponential backoff retry (max 5 attempts). Failed tasks SHALL be visible to sysadmins.

#### Scenario: OpenWebUI API temporarily down
- **WHEN** provisioning fails because the OpenWebUI API returns 503
- **THEN** the task is marked "retrying" with next_retry_at set to 2 minutes later, and the system retries automatically

#### Scenario: Max retries exceeded
- **WHEN** a provisioning task fails 5 times
- **THEN** the task is marked "failed" and appears in the sysadmin dashboard for manual intervention

### Requirement: Welcome email contains instance access details
The welcome email SHALL include: the user's name, their assigned instance URL (e.g., cornwall.yardie.ai), their login email, a temporary password, and instructions to change their password on first login.

#### Scenario: Welcome email content
- **WHEN** user "alice" is provisioned to "cornwall"
- **THEN** she receives an email with subject "Welcome to Yardie AI" containing the link to cornwall.yardie.ai and her credentials

### Requirement: Provisioning is idempotent
Re-running provisioning for an already-provisioned user SHALL NOT create duplicate accounts. The system SHALL check if the OpenWebUI account and LiteLLM key already exist before creating them.

#### Scenario: Duplicate provisioning attempt
- **WHEN** provisioning runs for a user who already has an OpenWebUI account in that instance
- **THEN** the existing account is preserved and the task is marked "completed"
