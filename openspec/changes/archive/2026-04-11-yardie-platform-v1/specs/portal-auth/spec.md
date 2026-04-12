## ADDED Requirements

### Requirement: Users can sign up with email and password
The portal SHALL provide a signup page at `/signup` with fields for name, email, and password. Passwords SHALL be at least 8 characters. On successful signup, the system SHALL create the user in a "pending" state and send a verification email via Resend.

#### Scenario: Successful signup
- **WHEN** a user submits the signup form with a valid name, email, and password
- **THEN** a user record is created in the portal database with `emailVerified: false`, and a verification email is sent

#### Scenario: Duplicate email
- **WHEN** a user submits a signup form with an email that already exists
- **THEN** the system returns an error "An account with this email already exists"

#### Scenario: Weak password
- **WHEN** a user submits a password shorter than 8 characters
- **THEN** the system returns a validation error and does not create the account

### Requirement: Users must verify their email before accessing the dashboard
After signup, users SHALL receive a verification email with a link. Clicking the link SHALL mark their email as verified. Unverified users who attempt to log in SHALL see a message prompting them to check their email.

#### Scenario: Email verification
- **WHEN** a user clicks the verification link in their email
- **THEN** their `emailVerified` flag is set to true and they are redirected to the login page with a success message

#### Scenario: Unverified login attempt
- **WHEN** a user with an unverified email attempts to log in
- **THEN** the system shows "Please verify your email before logging in" with an option to resend the verification email

### Requirement: Users can log in with email and password
The portal SHALL provide a login page at `/login`. On successful login, a database-backed session SHALL be created with a 7-day duration. The session cookie SHALL be httpOnly, secure, and sameSite=lax.

#### Scenario: Successful login
- **WHEN** a verified user submits correct email and password
- **THEN** a session is created, a session cookie is set, and the user is redirected to `/dashboard`

#### Scenario: Invalid credentials
- **WHEN** a user submits incorrect email or password
- **THEN** the system returns "Invalid email or password" without revealing which field is wrong

### Requirement: Users can reset their password
The portal SHALL provide a "Forgot password?" link on the login page. Users enter their email, receive a reset link via Resend, and can set a new password.

#### Scenario: Password reset flow
- **WHEN** a user requests a password reset for a valid email
- **THEN** a reset email is sent with a time-limited link (1 hour expiry)

#### Scenario: Reset link used
- **WHEN** a user clicks a valid reset link and submits a new password
- **THEN** the password is updated (hashed with Argon2id) and the user is redirected to login

### Requirement: Password hashing uses Argon2id
All passwords SHALL be hashed using Argon2id with memory cost 65536 (64 MB), time cost 3, parallelism 4.

#### Scenario: Password storage
- **WHEN** a password is stored (signup or reset)
- **THEN** it is hashed with Argon2id before being written to the database

### Requirement: Sessions last 7 days
User sessions SHALL have a 7-day duration. Sessions SHALL be stored in the PostgreSQL database (not JWT). Sessions SHALL be revocable by the user or by admins.

#### Scenario: Session expiry
- **WHEN** a user's session is older than 7 days
- **THEN** the session is invalidated and the user is redirected to login

### Requirement: Rate limiting on auth endpoints
Login and signup endpoints SHALL be rate limited to prevent brute force attacks. Limit: 10 requests per minute per IP, tracked in Redis.

#### Scenario: Rate limit exceeded
- **WHEN** more than 10 login attempts are made from the same IP within 1 minute
- **THEN** subsequent requests return 429 Too Many Requests with a retry-after header
