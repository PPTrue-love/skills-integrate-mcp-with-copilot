# Mergington High School Activities API

A FastAPI application for viewing extracurricular activities and managing signups. Activity listings and participant lists are public; only authenticated teachers can register or unregister students.

## Features

- View all available extracurricular activities
- Teacher sign-in with credentials stored as salted PBKDF2 hashes in a local JSON file
- Teacher-only student registration and unregistration
- Public visibility of activities and participants

## Getting Started

1. Install the dependencies:

   ```
   pip install -r requirements.txt
   ```

2. Run the application:

   ```
   uvicorn app:app --app-dir src --reload
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                          |
| ------ | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Public list of activities and participants                           |
| POST   | `/admin/login`                                                    | Sign in as a teacher and start a session                              |
| GET    | `/admin/session`                                                  | Check whether the current browser has a teacher session               |
| POST   | `/admin/logout`                                                   | End the current teacher session                                      |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Teacher-only activity signup; returns 401 without a teacher session  |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Teacher-only unregister; returns 401 without a teacher session    |

## Teacher Accounts

Create or update a teacher account interactively from the repository root:

```
python src/create_teacher.py
```

The script writes hashed credentials to `src/teachers.json`, which is ignored by Git. `src/teachers.example.json` shows the expected structure. Set `TEACHERS_FILE` to use a different credential file. For deployment, set `SESSION_SECRET` to a long, random secret and use HTTPS with `SESSION_HTTPS_ONLY=true`. The built-in session secret is for local development only.

Run the focused API tests with:

```
python -m unittest discover -s src -p 'test_*.py'
```

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

All activity and participant data is stored in memory, which means it resets when the server restarts. Teacher credentials are stored separately in the local JSON file.
