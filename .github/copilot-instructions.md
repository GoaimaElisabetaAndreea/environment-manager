<!--
  Generated guidance for AI coding agents working on this repository.
  Keep concise, actionable, and specific to files and patterns in this project.
-->
# Copilot / AI Agent Instructions

**Purpose:** Help contributors quickly implement and modify the server and integrate with Firebase Admin (Firestore). Be explicit about file locations, run commands, and the way Firestore is accessed.

**Big Picture:**
- **Server:** `server/` is an Express app using `firebase-admin` (Firestore) for backend data. Main entry is `server/app.js`. Firebase admin is initialized in `server/config/firebase.js` and exports `{ admin, db }`.
- **Client:** `client/` exists as the front-end area (not detailed in repo). Coordinate API changes with `server/` routes.

**Key files to inspect:**
- `server/app.js` — current routes, middleware (`morgan`, `cors`, `express.json()`), and the HTTP server.
- `server/config/firebase.js` — initializes `firebase-admin` using `server/serviceAccountKey.json` and exports `db`.
- `server/serviceAccountKey.json` — contains Firebase admin credentials (gitignored). Replace locally from Firebase console.
- `server/package.json` — scripts: `start` (node app.js) and `dev` (nodemon app.js).

Run & debug (local):
- Install deps: `cd server && npm install`
- Dev server: `cd server && npm run dev` (uses `nodemon`)
- Production run: `cd server && npm run start`
- Use a `.env` in `server/` for `PORT` or set `PORT` in the environment. `server/.env` is gitignored.

Firestore usage pattern (exact, copyable):
```
const { db } = require('./config/firebase');

// read a collection
const snapshot = await db.collection('myCollection').get();

// add a document
await db.collection('myCollection').add({ foo: 'bar' });
```
When adding or modifying handlers, require `db` from `server/config/firebase.js` — do not re-init `firebase-admin` elsewhere.

Conventions & patterns discovered in this repo:
- Single-file route handlers live in `server/app.js`. Introducing routers is fine but follow the pattern of exporting `db` from `server/config/firebase.js` and importing it where needed.
- Sensitive files: `server/serviceAccountKey.json` and `server/.env` are ignored by `.gitignore`. Never print or commit them.
- Add dependencies to `server/package.json` and run `npm install` in `server/` (server-local node_modules are expected).

Integration notes:
- The server uses `firebase-admin` (not client SDK): operations are direct admin-level Firestore reads/writes.
- Any client-facing auth should be handled by the client with Firebase client SDK tokens; server can verify tokens via `admin.auth().verifyIdToken(...)` (import `admin` from `server/config/firebase.js`).

What to change when adding features:
- Add API routes to `server/app.js` or create `server/routes/*.js` and `require('./routes/xyz')` from `app.js`.
- Use `db.collection(...).doc(...).set/get/update/delete()` for Firestore mutations.
- Update `server/package.json` if new dev or start scripts are needed.

Safety & ops:
- Keep `serviceAccountKey.json` local. Use environment variables for secrets where possible.

If you need more context (missing client details, tests, or CI), ask the maintainers for:
- a minimal `client/` README describing the front-end stack
- any intended Firestore rules, indexes, or example data for integration testing

If this file should merge with an existing `.github/copilot-instructions.md`, preserve any maintainer-written policy sections (PR style, codeowners) and append the repo-specific sections above.

— End of instructions —
