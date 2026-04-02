## ADDED Requirements

### Requirement: Email form collects user email addresses
The landing page SHALL include a "Join the Waiting List" section with an email input field and a submit button. The form SHALL validate that the email field is non-empty and is a valid email format before submission.

#### Scenario: User submits a valid email
- **WHEN** a user enters a valid email address and clicks "Join Waiting List"
- **THEN** the form sends a POST request to `/api/submit-email` with the email in the request body

#### Scenario: User submits an empty form
- **WHEN** a user clicks "Join Waiting List" without entering an email
- **THEN** the browser's built-in HTML5 validation prevents submission (input has `required` and `type="email"` attributes)

### Requirement: Email form shows success state after submission
After a successful email submission, the form SHALL:
1. Change the button text to "Added to List!" with a green gradient background
2. Show a success message: "Thanks! We'll be in touch soon." with a check icon
3. Clear and disable the email input field
4. Disable the submit button to prevent duplicate submissions

#### Scenario: Successful submission updates the UI
- **WHEN** the API returns a 200 response with `{ "status": "success" }`
- **THEN** the button changes to green with "Added to List!", the success message appears, and both the input and button become disabled

### Requirement: Email form handles errors gracefully
If the API returns an error response or the network request fails, the form SHALL reset the button to its original state and display an error alert.

#### Scenario: API returns an error
- **WHEN** the API returns a non-200 response or `{ "status": "error" }`
- **THEN** the button re-enables with the original "Join Waiting List" text and an error alert is shown

#### Scenario: Network request fails
- **WHEN** the fetch request to `/api/submit-email` fails (network error)
- **THEN** the button re-enables with the original text and an error alert is shown

### Requirement: Email form disables during submission
While the form is submitting, the submit button SHALL be disabled and display "Submitting..." to prevent duplicate submissions.

#### Scenario: Button shows loading state
- **WHEN** the user clicks "Join Waiting List" and the request is in flight
- **THEN** the button text changes to "Submitting..." and the button is disabled

### Requirement: API route validates and stores emails
The `POST /api/submit-email` route handler SHALL:
1. Parse the request body (supports both JSON and form-urlencoded)
2. Validate the email field using Zod (non-empty string, valid email format)
3. Insert the email into the SQLite `emails` table with a timestamp
4. Return `{ "status": "success" }` with a 200 status code on success

#### Scenario: Valid email is stored
- **WHEN** a POST request is sent to `/api/submit-email` with a valid email
- **THEN** the email is inserted into the `emails` table and the response is `{ "status": "success" }` with status 200

#### Scenario: Missing email returns 400
- **WHEN** a POST request is sent to `/api/submit-email` without an email field
- **THEN** the response is `{ "status": "error", "message": "Valid email required" }` with status 400

#### Scenario: Invalid email format returns 400
- **WHEN** a POST request is sent to `/api/submit-email` with `email: "not-an-email"`
- **THEN** the response is `{ "status": "error", "message": "Valid email required" }` with status 400

### Requirement: SQLite database initializes on first use
The database module SHALL create the `emails` table if it does not exist on first import. The table schema SHALL be:
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `email`: TEXT NOT NULL
- `submitted_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

The database SHALL use WAL journal mode for better concurrent read performance.

#### Scenario: Fresh database is initialized
- **WHEN** the application starts with no existing database file
- **THEN** the `emails` table is created automatically

#### Scenario: Existing database is preserved
- **WHEN** the application starts with an existing `emails.db` containing data
- **THEN** the existing data is preserved and new emails are appended

### Requirement: API route sets CORS headers
The API route SHALL include `Access-Control-Allow-Origin: *` in success responses to support any future cross-origin usage.

#### Scenario: CORS header is present
- **WHEN** a successful POST request is made to `/api/submit-email`
- **THEN** the response includes the `Access-Control-Allow-Origin: *` header
