# PulseRoute Backend Recovery Report

## Audit Summary

PulseRoute is structured as one backend and three Vite React frontend apps.

Existing frontend apps:
- `driver-app`
- `hospital-app`
- `user-app`

Existing backend files before recovery:
- `backend/package.json`
- `backend/package-lock.json`
- `backend/.env`
- `backend/.gitignore`
- `backend/modules/dispatch/dispatch.service.js`
- `backend/modules/driver/driver.model.js`
- `backend/modules/driver/driver.route.js`
- `backend/modules/ride/ride.route.js`
- `backend/sockets/index.js`
- `backend/utils/route.js`

Missing backend files identified:
- `backend/server.js`
- `backend/config/db.js`
- `backend/modules/ride/ride.model.js`
- `backend/modules/auth/auth.model.js`
- `backend/modules/auth/auth.route.js`
- `backend/shared/middleware/auth.js`

Broken references found:
- `backend/modules/ride/ride.route.js` required `./ride.model`, but the file did not exist.
- `backend/modules/driver/driver.route.js` required `../../shared/middleware/auth`, but the file did not exist.
- `driver-app/src/services/auth.js` calls `POST /api/auth/login`, but no auth route existed.
- `backend/package.json` starts `server.js`, but `backend/server.js` did not exist.

## Files Created

- `backend/server.js`
  - Loads environment variables.
  - Configures Express.
  - Configures CORS.
  - Creates HTTP server.
  - Configures Socket.IO.
  - Mounts `/api/auth`, `/api/driver`, and `/api/ride`.
  - Adds `/health`.
  - Adds 404 and error handlers.

- `backend/config/db.js`
  - Adds MongoDB connection setup through Mongoose.
  - Reads `MONGO_URI`.
  - Adds a startup timeout through `MONGO_TIMEOUT_MS` or 10000 ms.

- `backend/modules/auth/auth.model.js`
  - Adds Auth model.
  - Supports name, email, password, and role.
  - Hashes passwords with bcrypt.
  - Provides password comparison.

- `backend/modules/auth/auth.route.js`
  - Adds `POST /api/auth/register`.
  - Adds `POST /api/auth/login`.
  - Adds `GET /api/auth/me`.
  - Issues JWT tokens compatible with the existing driver app.

- `backend/shared/middleware/auth.js`
  - Adds Bearer token JWT middleware.
  - Verifies `JWT_SECRET`.
  - Loads authenticated user into `req.user`.

- `backend/modules/ride/ride.model.js`
  - Adds Ride model.
  - Supports `REQUESTED`, `DRIVER_ASSIGNED`, `ONGOING`, and `COMPLETED`.
  - Stores user location as GeoJSON Point.
  - Stores assigned driver reference.

## Files Repaired

- `backend/modules/driver/driver.route.js`
  - Preserved existing endpoints.
  - Fixed dependency on newly created auth middleware.
  - Added validation for driver creation and location updates.
  - Kept compatibility with driver app calls:
    - `GET /api/driver/me`
    - `POST /api/driver/update-location`
    - `POST /api/driver/set-availability`

- `backend/modules/ride/ride.route.js`
  - Preserved existing endpoints:
    - `POST /api/ride/request`
    - `POST /api/ride/accept`
    - `POST /api/ride/start`
    - `POST /api/ride/complete`
  - Connected route logic to the new Ride model.
  - Added ObjectId validation.
  - Emits ride lifecycle socket events.
  - Keeps existing `newRide` dispatch behavior for drivers.

- `backend/sockets/index.js`
  - Preserved existing socket events:
    - `joinRide`
    - `joinDriver`
    - `driverLocation`
  - Replaced hard-coded user destination with the ride's stored user location.
  - Emits live driver location, ETA, and route to the ride room for user and hospital apps.

- `backend/server.js`
  - Added clear listen error handling so occupied ports report cleanly.

## Files Removed

No project files were removed.

## Backend Routes After Recovery

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/driver/create`
- `GET /api/driver/all`
- `POST /api/driver/update-location`
- `POST /api/driver/set-availability`
- `GET /api/driver/me`
- `POST /api/ride/request`
- `POST /api/ride/accept`
- `POST /api/ride/start`
- `POST /api/ride/complete`

## Flow Compatibility

User app:
- Calls `POST /api/ride/request`.
- Joins the ride room with `joinRide`.
- Receives `driverLocation`.

Dispatch service:
- Finds available drivers with a geospatial query.
- Emits `newRide` to each nearby driver's socket room.

Driver app:
- Calls `POST /api/auth/login`.
- Calls `GET /api/driver/me`.
- Joins driver room with `joinDriver`.
- Receives `newRide`.
- Calls `POST /api/ride/accept`.
- Sends GPS updates through `driverLocation`.

Hospital app:
- Joins ride room with `joinRide`.
- Receives `driverLocation`.
- Displays ambulance coordinates, route, and ETA.

## Verification

Completed:
- Backend import check passed with `node -e "require('./server')"`.
- MongoDB Atlas connection succeeded using the configured `MONGO_URI`.
- Backend startup succeeded on a temporary available port with:
  - `PulseRoute backend running on port 5051`
- No missing backend imports remain in the recovered code.

Observed:
- Port `5000` is currently occupied on this machine, so direct startup on the configured frontend port failed with `EADDRINUSE`.
- `npm.cmd run dev` starts a long-running backend process on a temporary port; the command timed out because dev servers do not exit by themselves.

## Remaining Issues

- Free port `5000` before running the complete frontend-to-backend flow, or update all frontend `localhost:5000` URLs to a new backend port.
- The current `.env` contains normal keys, but also appears to include an extra raw JWT-like line. It was not modified during recovery.
- Existing frontend socket/API URLs are hard-coded to `http://localhost:5000`.
- A driver account and matching driver profile must exist before dispatch can find and notify a driver.
- End-to-end browser testing still depends on a free backend port and seeded driver data.

## Recommended Next Steps

1. Stop the process using port `5000` or choose a new shared backend port.
2. Register or seed a driver auth user through `POST /api/auth/register`.
3. Log in from the driver app.
4. Create or update the driver profile with `POST /api/driver/create`.
5. Set the driver online.
6. Request a ride from the user app.
7. Accept the ride from the driver app.
8. Join the same ride ID from the hospital app.
9. Verify live location, route, and ETA update across user and hospital views.
