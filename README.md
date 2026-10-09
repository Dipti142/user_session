# Single-session authentication API

TypeScript, Express, PostgreSQL and bcrypt authentication API. A user can have
only one active session: a successful login replaces the previous session, so
the previous device's next authenticated request receives `401`.

## Project structure

```text
sql/schema.sql                    PostgreSQL tables and indexes
src/app.ts                        Express middleware and error handling
src/server.ts                     Database check, server startup, shutdown
src/config/db.ts                  PostgreSQL connection pool
src/controllers/auth.controller.ts Register, login, logout and current user
src/middleware/auth.middleware.ts Cookie session verification
src/routes/auth.routes.ts         Auth route definitions
src/scripts/init-db.ts            Local schema initializer
src/utils/token.ts                Secure session token generation and hashing
curl.md                           Full curl test walkthrough
postman/single-session-auth.postman_collection.json
                                  Importable Postman test collection
```

## Run locally without Docker

Prerequisites: Node.js 20 or newer and a local PostgreSQL server.

1. Create a PostgreSQL database. For example, from a local `psql` prompt:

   ```sql
   CREATE DATABASE single_session_auth;
   ```

2. Install dependencies and create your local environment file:

   ```sh
   npm install
   cp .env.example .env
   ```

3. Set `DATABASE_URL` in `.env` to match your local PostgreSQL username,
   password and database. The example assumes `postgres:postgres`.

4. Create the tables and indexes, then start the API:

   ```sh
   psql -h localhost -U postgres -d single_session_auth -f sql/schema.sql
   npm run dev
   ```

   Replace `postgres` with your PostgreSQL username if needed. PostgreSQL must
   allow that user to create the `pgcrypto` extension if it is not already
   installed.

5. Check the server at `http://localhost:3000/health`.

For a production build, run `npm run build` and then `npm start`. Keep
`COOKIE_SECURE=false` only for local HTTP development. Set it to `true` when
serving the API over HTTPS. `COOKIE_SAME_SITE=none` requires secure cookies.

## API

All request and response bodies are JSON. Login sets an `HttpOnly` cookie; send
that cookie with authenticated requests. No JWT or plaintext session token is
stored in PostgreSQL.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Log in and replace any prior session |
| `POST` | `/api/auth/logout` | Invalidate the current session |
| `GET` | `/api/auth/me` | Return the authenticated user |
| `GET` | `/health` | Check API availability |

Registration body:

```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "StrongPass123!"
}
```

Login body:

```json
{
  "email": "test@example.com",
  "password": "StrongPass123!"
}
```

Validation requires a trimmed name of 2-100 characters, a valid email up to
255 characters and a password of 8-72 characters. Emails are matched without
case sensitivity. Relevant status codes are `201` (registered), `200`
(success), `400` (validation/invalid JSON), `401` (invalid credentials or
inactive session), and `409` (email already registered).

## Test with curl

Run the device-by-device flow in [curl.md](curl.md). Laptop A and Laptop B use
separate cookie files, so the flow proves that logging in on B invalidates A.

## Test with Postman

1. Import `postman/single-session-auth.postman_collection.json` into Postman.
2. Select the collection's **Variables** tab and set `email` to an address you
   control for testing. `name`, `password`, and `baseUrl` can also be changed.
3. Run the requests in order: Register, Laptop A Login, Laptop A Me, Laptop B
   Login, Laptop A Me (must be unauthorized), Laptop B Me, Laptop B Logout,
   and Laptop B Me (must be unauthorized).
4. The login requests capture each `Set-Cookie` token into a separate
   collection variable. The `/me` requests send those tokens explicitly, so
   Postman's shared cookie jar cannot blur the two simulated devices.

The collection includes Postman test assertions for successful registration,
session replacement and logout.