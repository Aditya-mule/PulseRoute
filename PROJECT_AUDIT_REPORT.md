# PulseRoute Project Audit Report

## Bugs Found

1. User app only listened for `driverLocation`.
   - Missing listeners for `rideAccepted`, `rideStarted`, and `rideCompleted`.
   - Ride status did not update automatically after driver actions.
   - Driver details were not shown after ride acceptance.

2. Driver app did not support the complete ride lifecycle.
   - Driver could accept rides but could not start or complete them from the UI.
   - Active ride state was not restored safely after refresh.
   - GPS tracking was incorrectly gated by `isAvailable`; an assigned driver becomes unavailable in the DB, so this could stop tracking during an active ride.
   - Raw `fetch` call bypassed the existing API helper and auth/header pattern.
   - No clear loading/error state for profile and ride actions.

3. Hospital app only listened for `driverLocation`.
   - Missing listeners for `rideAccepted`, `rideStarted`, and `rideCompleted`.
   - Could not fetch initial ride state before live GPS events arrived.
   - Did not show ride status or driver details.

4. Backend ride lifecycle payloads were incomplete.
   - `rideAccepted`, `rideStarted`, and `rideCompleted` emitted only IDs, not the updated ride state.
   - `driverLocation` did not include the current ride status or driver details.
   - No `GET /api/ride/:rideId` endpoint existed for initial dashboard state and refresh recovery.

5. Database update options used deprecated-style Mongoose patterns.
   - Replaced `{ new: true }` with `{ returnDocument: "after" }` in repaired update calls.

6. Hospital app introduced an API helper need but did not have `axios` installed.
   - Fixed by using native `fetch` in the hospital app helper.

## Files Changed

Backend:
- `backend/modules/ride/ride.route.js`
- `backend/modules/driver/driver.route.js`
- `backend/sockets/index.js`

Driver app:
- `driver-app/src/App.jsx`
- `driver-app/src/services/api.js`
- `driver-app/src/services/driver.js`

User app:
- `user-app/src/App.jsx`
- `user-app/src/components/MapView.jsx`
- `user-app/src/components/RideCard.jsx`
- `user-app/src/services/api.js`

Hospital app:
- `hospital-app/src/App.jsx`
- `hospital-app/src/components/MapView.jsx`
- `hospital-app/src/services/api.js`

Reports:
- `PROJECT_AUDIT_REPORT.md`

## Code Fixes Applied

Backend:
- Added `GET /api/ride/:rideId`.
- Populated driver data for ride lifecycle responses.
- Emitted full `ride` payloads for:
  - `rideAccepted`
  - `rideStarted`
  - `rideCompleted`
- Enriched `driverLocation` payloads with:
  - `rideId`
  - `ride`
  - `status`
  - `driver`
  - `eta`
  - `route`
- Enforced lifecycle transitions:
  - `REQUESTED` -> `DRIVER_ASSIGNED`
  - `DRIVER_ASSIGNED` -> `ONGOING`
  - `ONGOING` -> `COMPLETED`
- Ensured driver availability becomes `false` on accept and `true` on complete.
- Replaced repaired update calls with `{ returnDocument: "after" }`.

Driver app:
- Centralized ride API calls in `driver-app/src/services/driver.js`.
- Added ride restore through `GET /api/ride/:rideId`.
- Added listeners for `rideAccepted`, `rideStarted`, and `rideCompleted`.
- Added start ride and complete ride controls.
- Persisted active ride ID/status in localStorage.
- Restored GPS tracking after refresh for active rides.
- Removed availability as a GPS tracking gate.
- Added profile loading, action loading, and error display.
- Shows driver name, phone, active ride ID, and ride status.

User app:
- Added lifecycle listeners for `rideAccepted`, `rideStarted`, and `rideCompleted`.
- Updates ride status automatically.
- Shows assigned driver name and phone after acceptance.
- Shows completion state and allows requesting another ambulance.
- User map now renders backend-generated route/ETA from socket payloads.

Hospital app:
- Added ride lookup by ID before joining live socket updates.
- Added lifecycle listeners for `rideAccepted`, `rideStarted`, and `rideCompleted`.
- Shows ride status, assigned driver name, and assigned driver phone.
- Shows live ambulance coordinates, ETA, and route.
- Handles connection loading/error states.

## Socket.IO Verification

Verified events:
- `joinRide`
- `joinDriver`
- `newRide`
- `rideAccepted`
- `rideStarted`
- `rideCompleted`
- `driverLocation`

Room behavior:
- Drivers join their own driver room through `joinDriver(driverId)`.
- Users, drivers, and hospitals join the ride room through `joinRide(rideId)`.
- `newRide` is emitted to nearby driver rooms.
- Ride lifecycle and GPS events are emitted to the ride room.
- Frontend listeners are cleaned up with matching `socket.off(...)` handlers.

## Test Results

Passed:
- `node -e "require('./server')"` from `backend`
- `npm.cmd run lint` from `user-app`
- `npm.cmd run lint` from `driver-app`
- `npm.cmd run lint` from `hospital-app`
- `npm.cmd run build` from `user-app`
- `npm.cmd run build` from `driver-app`
- `npm.cmd run build` from `hospital-app`

End-to-end backend/socket simulation passed on temporary port `5061`.

Simulation flow:
1. Registered throwaway driver auth user.
2. Created throwaway driver profile.
3. Driver socket joined driver room.
4. Ride socket joined ride room.
5. User request created a ride.
6. Driver received `newRide`.
7. Driver accepted ride.
8. Ride room received `rideAccepted: DRIVER_ASSIGNED`.
9. Driver started ride.
10. Ride room received `rideStarted: ONGOING`.
11. Driver emitted GPS update.
12. Ride room received `driverLocation` with ETA and route.
13. Driver completed ride.
14. Ride room received `rideCompleted: COMPLETED`.
15. Driver availability returned to `true`.
16. Throwaway test records were removed.

Observed simulation event result:

```json
{
  "events": [
    "newRide:true",
    "rideAccepted:DRIVER_ASSIGNED",
    "rideStarted:ONGOING",
    "driverLocation:true:true",
    "rideCompleted:COMPLETED"
  ],
  "finalRideStatus": "COMPLETED",
  "finalDriverAvailable": true
}
```

## Remaining Issues

- Frontend API and Socket.IO URLs are still hard-coded to `http://localhost:5000`.
- User app still requests a fixed demo location `{ lng: 77.59, lat: 12.97 }`.
- Driver app requires browser geolocation permission for real GPS tracking.
- Existing `user-app/src/services/route.js` is now unused after moving route rendering to backend socket payloads.
- The apps do not yet have role-specific protected routing beyond driver token checks.
- There is no automated test suite checked into the repo.

## Suggested Next Features

1. Move API and socket base URLs into `.env` files for all frontend apps.
2. Add real user geolocation selection in the user app.
3. Add hospital authentication and role checks.
4. Add ride history for users, drivers, and hospitals.
5. Add driver assignment cancellation and timeout handling.
6. Add automated integration tests for ride lifecycle transitions.
7. Add admin tools to seed drivers and inspect active rides.
8. Add a shared API client package or constants file to reduce hard-coded endpoint drift.
