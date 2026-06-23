import { useCallback, useEffect, useMemo, useState } from "react";
import { socket } from "./socket/socket";
import Login from "./pages/Login";
import {
  acceptRide,
  completeRide,
  getDriverProfile,
  getRide,
  setAvailability,
  startRide,
  updateLocation
} from "./services/driver";
import { jwtDecode } from "jwt-decode";

const savedRideId = localStorage.getItem("activeRideId") || "";
const savedRideStatus = localStorage.getItem("activeRideStatus") || "";

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.$oid) return value.$oid;
  return String(value);
};

function App() {
  const token = localStorage.getItem("token");

  const [rideId, setRideId] = useState(savedRideId);
  const [rideStatus, setRideStatus] = useState(savedRideStatus);
  const [tracking, setTracking] = useState(Boolean(savedRideId && savedRideStatus !== "COMPLETED"));
  const [driver, setDriver] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [incomingRide, setIncomingRide] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [profileLoading, setProfileLoading] = useState(Boolean(token));
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [location, setLocation] = useState({
    lat: 12.97,
    lng: 77.59
  });

  const applyRideState = useCallback((rideData) => {
    if (!rideData) return;

    setActiveRide(rideData);
    setRideStatus(rideData.status);
    localStorage.setItem("activeRideStatus", rideData.status);

    if (rideData.status === "COMPLETED") {
      setTracking(false);
      setIsAvailable(true);
      setRideId("");
      localStorage.removeItem("activeRideId");
      localStorage.removeItem("activeRideStatus");
      return;
    }

    if (rideData._id) {
      const id = normalizeId(rideData._id);
      setRideId(id);
      if (rideData.status !== "REQUESTED") {
        localStorage.setItem("activeRideId", id);
      }
    }
  }, []);

  const driverInfo = useMemo(() => {
    if (!token) return null;

    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    setProfileLoading(true);
    getDriverProfile()
      .then((res) => {
        setDriver(res.data);
        setIsAvailable(res.data.isAvailable);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Unable to load driver profile");
      })
      .finally(() => setProfileLoading(false));
  }, [token]);

  useEffect(() => {
    if (!rideId) return;

    localStorage.setItem("activeRideId", rideId);

    getRide(rideId)
      .then((res) => {
        applyRideState(res.data.ride);
      })
      .catch((err) => {
        console.error("Ride restore error:", err);
      });
  }, [applyRideState, rideId]);

  useEffect(() => {
    if (!driver?._id) return;

    const handleNewRide = (data) => {
      const incoming = {
        ...data,
        rideId: normalizeId(data.rideId || data.ride?._id)
      };

      setError("");
      setIncomingRide(incoming);
      setActiveRide(data.ride || null);
      setRideStatus(data.ride?.status || "REQUESTED");
    };

    const joinDriverRoom = () => {
      socket.emit("joinDriver", driver._id);
    };

    socket.on("newRide", handleNewRide);
    socket.on("connect", joinDriverRoom);
    joinDriverRoom();

    return () => {
      socket.off("newRide", handleNewRide);
      socket.off("connect", joinDriverRoom);
    };
  }, [driver?._id]);

  useEffect(() => {
    if (!rideId) return;

    socket.emit("joinRide", rideId);

    const applyRideEvent = (data) => {
      if (data.ride) {
        applyRideState(data.ride);
      }
    };

    const handleCompleted = (data) => {
  applyRideEvent(data);

  setTracking(false);
  setIsAvailable(true);

  setRideId("");
  setRideStatus("");
  setActiveRide(null);

  localStorage.removeItem("activeRideId");
  localStorage.removeItem("activeRideStatus");
};

    socket.on("rideAccepted", applyRideEvent);
    socket.on("rideStarted", applyRideEvent);
    socket.on("rideCompleted", handleCompleted);

    return () => {
      socket.off("rideAccepted", applyRideEvent);
      socket.off("rideStarted", applyRideEvent);
      socket.off("rideCompleted", handleCompleted);
    };
  }, [applyRideState, rideId]);

  const handleToggleAvailability = async () => {
    try {
      setActionLoading(true);
      const newStatus = !isAvailable;
      const res = await setAvailability(newStatus);
      setIsAvailable(res.data.isAvailable);
    } catch (err) {
      setError(err.response?.data?.message || "Availability update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRide = async () => {
    if (!incomingRide || !driver?._id) return;

    try {
      setActionLoading(true);
      const res = await acceptRide({
        rideId: incomingRide.rideId,
        driverId: driver._id
      });

      applyRideState(res.data.ride);
      setIncomingRide(null);
      setIsAvailable(false);
      localStorage.setItem("activeRideId", incomingRide.rideId);
      localStorage.setItem("activeRideStatus", res.data.ride.status);
    } catch (err) {
      setError(err.response?.data?.message || "Accept ride failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartRide = async () => {
    if (!rideId) return;

    try {
      setActionLoading(true);
      setError("");

      const latest = await getRide(rideId);
      applyRideState(latest.data.ride);

      if (latest.data.ride.status === "REQUESTED") {
        setError("Accept this ride before starting it.");
        return;
      }

      const res = await startRide(rideId);
      applyRideState(res.data.ride);
      setTracking(true);
      localStorage.setItem("activeRideId", rideId);
      localStorage.setItem("activeRideStatus", res.data.ride.status);
    } catch (err) {
      setError(err.response?.data?.message || "Start ride failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteRide = async () => {
  if (!rideId) return;

  try {
    setActionLoading(true);

    await completeRide(rideId);

    setTracking(false);
    setIsAvailable(true);

    setRideId("");
    setRideStatus("");
    setActiveRide(null);

    localStorage.removeItem("activeRideId");
    localStorage.removeItem("activeRideStatus");
  } catch (err) {
    setError(err.response?.data?.message || "Complete ride failed");
  } finally {
    setActionLoading(false);
  }
};

  useEffect(() => {
    let watchId;

    if (tracking && rideId && rideStatus !== "COMPLETED") {
      socket.emit("joinRide", rideId);

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          setLocation(newLoc);

          updateLocation(newLoc).catch((err) =>
            console.error("Location API error:", err)
          );

          socket.emit("driverLocation", {
            rideId,
            lat: newLoc.lat,
            lng: newLoc.lng
          });
        },
        (geoError) => {
          setError(geoError.message || "GPS unavailable");
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [tracking, rideId, rideStatus]);

  if (!token) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-md space-y-5">
        <h1 className="text-2xl font-bold text-center text-blue-600">
          Driver Panel
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {profileLoading && (
          <p className="text-sm text-gray-500 text-center">Loading driver profile...</p>
        )}

        {driver && (
          <div className="bg-gray-50 p-4 rounded-xl">
            <p className="font-semibold text-gray-800">{driver.name}</p>
            <p className="text-sm text-gray-600">{driver.phone}</p>
          </div>
        )}

        {!driver && !profileLoading && driverInfo && (
          <p className="text-sm text-gray-500 text-center">
            Logged in as: {driverInfo.email || driverInfo.id}
          </p>
        )}

        <div className="flex justify-between items-center bg-gray-100 p-3 rounded-xl">
          <span className="text-sm font-medium">
            Status: {isAvailable ? "Online" : "Unavailable"}
          </span>

          <button
            onClick={handleToggleAvailability}
            disabled={actionLoading || Boolean(rideId && rideStatus !== "COMPLETED")}
            className={`px-4 py-1 rounded-lg text-white disabled:opacity-50 ${
              isAvailable ? "bg-red-500" : "bg-green-500"
            }`}
          >
            {isAvailable ? "Go Offline" : "Go Online"}
          </button>
        </div>

        {incomingRide && (
          <div className="bg-yellow-100 p-4 rounded-xl border border-yellow-400">
            <p className="font-semibold text-yellow-800">New Ride Request</p>
            <p className="text-sm text-gray-700">Ride ID: {incomingRide.rideId}</p>
            <button
              onClick={handleAcceptRide}
              disabled={actionLoading}
              className="mt-2 w-full bg-green-500 text-white py-2 rounded-lg disabled:opacity-50"
            >
              Accept Ride
            </button>
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-xl space-y-2">
          <p className="text-sm text-gray-500">Active Ride</p>
          <input
            type="text"
            placeholder="Enter Ride ID"
            value={rideId}
            onChange={(e) => setRideId(e.target.value)}
            className="w-full p-3 border rounded-xl"
          />
          <p className="text-sm">Ride Status: <span className="font-semibold">{rideStatus || "None"}</span></p>
          {activeRide?.driver && (
            <p className="text-sm text-gray-600">
              Assigned Driver: {activeRide.driver.name} ({activeRide.driver.phone})
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleStartRide}
            disabled={actionLoading || !rideId || rideStatus !== "DRIVER_ASSIGNED"}
            className="bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            Start Ride
          </button>
          <button
            onClick={handleCompleteRide}
            disabled={actionLoading || !rideId || rideStatus !== "ONGOING"}
            className="bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            Complete
          </button>
        </div>

        <button
          onClick={() => setTracking((current) => !current)}
          disabled={!rideId || rideStatus === "COMPLETED"}
          className="w-full bg-gray-800 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {tracking ? "Stop GPS Tracking" : "Resume GPS Tracking"}
        </button>

        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-500">Current Location</p>
          <p>Lat: {location.lat}</p>
          <p>Lng: {location.lng}</p>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("activeRideId");
            localStorage.removeItem("activeRideStatus");
            window.location.reload();
          }}
          className="text-sm text-red-500 underline"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default App;
