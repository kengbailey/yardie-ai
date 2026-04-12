## MODIFIED Requirements

### Requirement: Email waitlist migrates to PostgreSQL
The email submission endpoint SHALL store emails in the portal PostgreSQL database instead of SQLite. The `emails` table schema (id, email, submitted_at) SHALL be preserved. The API route SHALL be updated to use the pg driver.

#### Scenario: Email stored in PostgreSQL
- **WHEN** a visitor submits their email via the waitlist form
- **THEN** the email is stored in the `emails` table in `portal_db`

### Requirement: Waitlist emails viewable by sysadmin
The sysadmin dashboard SHALL include a section showing waitlist emails that can be invited to the platform.

#### Scenario: Sysadmin views waitlist
- **WHEN** a sysadmin navigates to `/admin/waitlist`
- **THEN** they see a list of submitted emails with submission dates and an "Invite" action button
