import API from "./api";

export const updateLocation = (data) =>
  API.post("/driver/update-location", data);

export const getDriverProfile = () =>
  API.get("/driver/me");

export const getRide = (rideId) =>
  API.get(`/ride/${rideId}`);

export const setAvailability = (isAvailable) =>
  API.post("/driver/set-availability", { isAvailable });

export const acceptRide = ({ rideId, driverId }) =>
  API.post("/ride/accept", { rideId, driverId });

export const startRide = (rideId) =>
  API.post("/ride/start", { rideId });

export const completeRide = (rideId) =>
  API.post("/ride/complete", { rideId });
