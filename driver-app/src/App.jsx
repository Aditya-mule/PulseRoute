import { useState, useEffect } from "react";
import { socket } from "./socket/socket";
import Login from "./pages/Login";
import {
  updateLocation,
  getDriverProfile,
  setAvailability
} from "./services/driver";
import { jwtDecode } from "jwt-decode";

function App() {
  const token = localStorage.getItem("token");

  const [rideId, setRideId] = useState("");
  const [tracking, setTracking] = useState(false);
  const [driver, setDriver] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [incomingRide, setIncomingRide] = useState(null);

  const [location, setLocation] = useState({
    lat: 12.97,
    lng: 77.59
  });

  // 🔐 Decode token
  let driverInfo = null;
  if (token) {
    try {
      driverInfo = jwtDecode(token);
    } catch {
      console.error("Invalid token");
    }
  }

  // 👤 Fetch driver profile
  useEffect(() => {
    if (!token) return;

    getDriverProfile()
      .then((res) => {
        setDriver(res.data);
        setIsAvailable(res.data.isAvailable);
      })
      .catch((err) => {
        console.error("Profile fetch error:", err);
      });
  }, [token]);

  // 🚨 Listen for incoming rides
  useEffect(() => {
    if (!driver?._id) return;

    socket.emit("joinDriver", driver._id);

    socket.on("newRide", (data) => {
      console.log("🚨 New Ride:", data);
      setIncomingRide(data);
    });

    return () => socket.off("newRide");
  }, [driver]);

  // 🔄 Toggle availability
  const handleToggleAvailability = async () => {
    try {
      const newStatus = !isAvailable;
      await setAvailability(newStatus);
      setIsAvailable(newStatus);
    } catch (err) {
      console.error("Availability error:", err);
    }
  };

  // ✅ Accept Ride
  const handleAcceptRide = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/ride/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rideId: incomingRide.rideId,
          driverId: driver._id
        })
      });

      const data = await res.json();

      console.log("Ride accepted:", data);

      setRideId(incomingRide.rideId);
      setIncomingRide(null);
      setTracking(true);

    } catch (err) {
      console.error("Accept error:", err);
    }
  };

  // 📍 Tracking logic
  useEffect(() => {
    let watchId;

    if (tracking && rideId && isAvailable) {
      socket.emit("joinRide", rideId);

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          setLocation(newLoc);

          updateLocation(newLoc).catch((err) =>
            console.error("API error:", err)
          );

          socket.emit("driverLocation", {
            rideId,
            lat: newLoc.lat,
            lng: newLoc.lng
          });
        },
        (error) => {
          console.error("GPS error:", error);
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
  }, [tracking, rideId, isAvailable]);

  // 🔐 Auth check
  if (!token) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-md space-y-5">

        <h1 className="text-2xl font-bold text-center text-blue-600">
          🚑 Driver Panel
        </h1>

        {/* 👤 Driver Info */}
        {driver && (
          <p className="text-sm text-gray-600 text-center">
            👤 {driver.name} ({driver.phone})
          </p>
        )}

        {!driver && driverInfo && (
          <p className="text-sm text-gray-500 text-center">
            Logged in as: {driverInfo.email || driverInfo.id}
          </p>
        )}

        {/* 🟢 Availability */}
        <div className="flex justify-between items-center bg-gray-100 p-3 rounded-xl">
          <span className="text-sm font-medium">
            Status: {isAvailable ? "🟢 Online" : "🔴 Offline"}
          </span>

          <button
            onClick={handleToggleAvailability}
            className={`px-4 py-1 rounded-lg text-white ${
              isAvailable ? "bg-red-500" : "bg-green-500"
            }`}
          >
            {isAvailable ? "Go Offline" : "Go Online"}
          </button>
        </div>

        {/* 🚨 Incoming Ride */}
        {incomingRide && (
          <div className="bg-yellow-100 p-4 rounded-xl border border-yellow-400">
            <p className="font-semibold text-yellow-800">
              🚨 New Ride Request
            </p>

            <p className="text-sm text-gray-700">
              Ride ID: {incomingRide.rideId}
            </p>

            <button
              onClick={handleAcceptRide}
              className="mt-2 w-full bg-green-500 text-white py-2 rounded-lg"
            >
              Accept Ride
            </button>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={() => {
            localStorage.removeItem("token");
            window.location.reload();
          }}
          className="text-sm text-red-500 underline"
        >
          Logout
        </button>

        {/* Ride ID */}
        <input
          type="text"
          placeholder="Enter Ride ID"
          value={rideId}
          onChange={(e) => setRideId(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        {/* Tracking */}
        {!tracking ? (
          <button
            onClick={() => {
              if (!rideId) {
                alert("Enter Ride ID first");
                return;
              }
              if (!isAvailable) {
                alert("You are offline");
                return;
              }
              setTracking(true);
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold"
          >
            Start Tracking
          </button>
        ) : (
          <button
            onClick={() => setTracking(false)}
            className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold"
          >
            Stop Tracking
          </button>
        )}

        {/* 📍 Location */}
        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-500">Current Location</p>
          <p>Lat: {location.lat}</p>
          <p>Lng: {location.lng}</p>
        </div>

      </div>
    </div>
  );
}

export default App;

