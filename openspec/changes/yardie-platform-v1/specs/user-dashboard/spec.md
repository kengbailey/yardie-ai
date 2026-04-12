## ADDED Requirements

### Requirement: Authenticated dashboard at /dashboard
The portal SHALL serve an authenticated dashboard at `/dashboard`. Unauthenticated users SHALL be redirected to `/login`. The dashboard SHALL show the user's name, email, assigned instance, and usage summary.

#### Scenario: Authenticated user views dashboard
- **WHEN** a logged-in user navigates to `/dashboard`
- **THEN** they see their name, assigned instance link, and usage stats

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user navigates to `/dashboard`
- **THEN** they are redirected to `/login`

### Requirement: Usage stats display
The dashboard SHALL display: total tokens used (current month), number of conversations, budget remaining (USD), and subscription tier (Free/Standard/Pro).

#### Scenario: User views usage stats
- **WHEN** a user with $0.45 remaining of a $1.00 budget views their dashboard
- **THEN** they see "Budget: $0.45 / $1.00 remaining" and their token/conversation counts

### Requirement: Instance link
The dashboard SHALL display a link to the user's assigned OpenWebUI instance (e.g., "Open Cornwall AI → cornwall.yardie.ai"). If the user has no assigned instance, it SHALL show "No instance assigned — contact your administrator."

#### Scenario: User with assigned instance
- **WHEN** a user assigned to "cornwall" views their dashboard
- **THEN** they see a link to "https://cornwall.yardie.ai"

#### Scenario: User without instance
- **WHEN** a user with no instance assignment views their dashboard
- **THEN** they see "No instance assigned — contact your administrator"
