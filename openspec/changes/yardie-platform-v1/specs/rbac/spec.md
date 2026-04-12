## ADDED Requirements

### Requirement: Three-tier role system with instance scoping
The system SHALL support three roles: user, manager, and sysadmin. User and manager roles SHALL be scoped to specific instances. Sysadmin SHALL be a global role granting access to all instances and administrative functions.

#### Scenario: User has instance-scoped role
- **WHEN** a user is assigned the "user" role for the "cornwall" instance
- **THEN** they can access cornwall.yardie.ai but not middlesex.yardie.ai

#### Scenario: Manager of one instance, user of another
- **WHEN** a user is a "manager" of "cornwall" and a "user" of "middlesex"
- **THEN** they can manage users in cornwall and use middlesex as a regular user

#### Scenario: Sysadmin has global access
- **WHEN** a user has the "sysadmin" global role
- **THEN** they can access all instances and all admin functions

### Requirement: Database schema for roles and instances
The system SHALL maintain three tables: `instances` (id, name, subdomain, base_url, status), `instance_roles` (user_id, instance_id, role), and `global_roles` (user_id, role). Instance roles have a composite primary key of (user_id, instance_id).

#### Scenario: Instance role assignment
- **WHEN** a sysadmin assigns user "alice" the "manager" role for instance "cornwall"
- **THEN** a row is inserted into instance_roles with user_id=alice, instance_id=cornwall, role=manager

### Requirement: Route protection by role
Protected routes SHALL check the user's role before rendering. `/dashboard` requires any authenticated user. `/instances/:id/manage` requires manager or sysadmin for that instance. `/admin/*` requires sysadmin.

#### Scenario: Unauthorized access to manager page
- **WHEN** a regular user navigates to `/instances/cornwall/manage`
- **THEN** they are redirected to `/unauthorized`

#### Scenario: Manager accesses their instance management
- **WHEN** a manager of cornwall navigates to `/instances/cornwall/manage`
- **THEN** the page renders with the management dashboard

### Requirement: First sysadmin created via CLI
The system SHALL provide a CLI command `npm run seed:admin -- --email <email>` that creates a user account with verified email and sysadmin global role. The command SHALL prompt for a password interactively or generate one.

#### Scenario: Seed admin command
- **WHEN** `npm run seed:admin -- --email admin@yardie.ai` is run
- **THEN** a user is created with emailVerified=true and a global_roles entry with role=sysadmin
