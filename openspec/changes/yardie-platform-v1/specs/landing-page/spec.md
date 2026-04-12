## MODIFIED Requirements

### Requirement: Landing page remains at root route
The existing landing page SHALL continue to serve at `/` as the marketing homepage. It SHALL remain a Server Component. A "Sign In" link SHALL be added to the header area, linking to `/login`.

#### Scenario: Landing page with sign-in link
- **WHEN** a visitor navigates to `/`
- **THEN** the landing page renders with the existing hero, features, and CTA sections, plus a "Sign In" link in the header

### Requirement: Authenticated users see dashboard link instead
When a logged-in user visits `/`, the "Sign In" link SHALL be replaced with "Dashboard" linking to `/dashboard`.

#### Scenario: Logged-in user on landing page
- **WHEN** an authenticated user navigates to `/`
- **THEN** the header shows "Dashboard" instead of "Sign In"
