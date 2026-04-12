## ADDED Requirements

### Requirement: Manager dashboard for instance user management
Managers SHALL have a dashboard at `/instances/:id/manage` showing all users assigned to their instance, each user's role, budget, budget used, and status.

#### Scenario: Manager views user list
- **WHEN** a manager of "cornwall" navigates to `/instances/cornwall/manage`
- **THEN** they see a table of all users in the cornwall instance with their roles, budgets, and usage

### Requirement: Managers can adjust user budgets
Managers SHALL be able to increase or decrease a user's monthly budget from the instance management dashboard. Budget changes SHALL take effect within the hour via the LiteLLM Admin API.

#### Scenario: Manager increases user budget
- **WHEN** a manager sets user "alice" budget from $1 to $5
- **THEN** the system updates alice's LiteLLM virtual key max_budget to $5

### Requirement: Managers can assign model access
Managers SHALL be able to control which models each user in their instance can access, selected from the models available to the instance.

#### Scenario: Manager restricts user to free models
- **WHEN** a manager sets user "bob" to only access "meta-llama/llama-3.1-70b-instruct"
- **THEN** bob's LiteLLM virtual key model allowlist is updated to only that model

### Requirement: Sysadmin dashboard for global management
Sysadmins SHALL have a dashboard at `/admin` showing all instances, all users, total platform spend, and system health. Sysadmins can create instances, assign managers, and configure global settings.

#### Scenario: Sysadmin views global dashboard
- **WHEN** a sysadmin navigates to `/admin`
- **THEN** they see all instances with user counts, total spend, and status indicators

### Requirement: Sysadmin can create instances
Sysadmins SHALL be able to register new OpenWebUI instances at `/admin/instances/new` by providing a name, subdomain, and base URL. The instance record SHALL be stored in the `instances` table.

#### Scenario: Sysadmin registers new instance
- **WHEN** a sysadmin creates an instance with name "Surrey", subdomain "surrey"
- **THEN** a record is created in the instances table with status "active"

### Requirement: Sysadmin can assign users to instances
Sysadmins SHALL be able to assign any user to any instance with a role (user or manager) from the admin dashboard.

#### Scenario: Sysadmin assigns user to instance
- **WHEN** a sysadmin assigns user "alice" to instance "cornwall" with role "manager"
- **THEN** an instance_role record is created and the user provisioning pipeline is triggered

### Requirement: A user can be manager of multiple instances
The system SHALL allow a single user to hold the "manager" role across multiple instances simultaneously.

#### Scenario: Multi-instance manager
- **WHEN** user "alice" is assigned as manager of both "cornwall" and "middlesex"
- **THEN** alice can manage users in both instances and sees both on her dashboard
