import { useEffect, useState } from "react";
import { getRide, requestRide } from "./services/api";
import { socket } from "./socket/socket";
import RideCard from "./components/RideCard";
import MapView from "./components/MapView";

const statusText = {
  REQUESTED: "Request received",
  DRIVER_ASSIGNED: "Ambulance assigned",
  ONGOING: "Ambulance en route",
  COMPLETED: "Ride completed"
};

const demoLocation = { lng: 77.59, lat: 12.97 };

const getCurrentLocation = () => new Promise((resolve) => {
  if (!navigator.geolocation) {
    resolve(demoLocation);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    },
    () => resolve(demoLocation),
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 5000
    }
  );
});

function App() {
  const [ride, setRide] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedRideId = localStorage.getItem("activeRideId");

    if (!savedRideId) {
      setRestoring(false);
      return;
    }

    getRide(savedRideId)
      .then((res) => {
        const restoredRide = res.data.ride;
        const savedLocation = localStorage.getItem("activeRideLocation");

        if (restoredRide.status === "COMPLETED") {
          localStorage.removeItem("activeRideId");
          localStorage.removeItem("activeRideLocation");
          setRide(restoredRide);
          return;
        }

        setRide(restoredRide);
        if (savedLocation) {
          try {
            setLocation(JSON.parse(savedLocation));
          } catch {
            localStorage.removeItem("activeRideLocation");
          }
        }
      })
      .catch(() => {
        localStorage.removeItem("activeRideId");
        localStorage.removeItem("activeRideLocation");
        setError("Previous ride could not be restored");
      })
      .finally(() => setRestoring(false));
  }, []);

  const handleRequestRide = async () => {
    setLoading(true);
    setError("");

    try {
      const userLocation = await getCurrentLocation();
      const res = await requestRide(userLocation);
      setRide(res.data.ride);
      localStorage.setItem("activeRideId", res.data.ride._id);
      localStorage.removeItem("activeRideLocation");
      setLocation(null);
    } catch (err) {
      const message = err.response?.data?.message || "No drivers available";
      setError(message);
      if (err.response?.data?.ride) {
        setRide(err.response.data.ride);
        localStorage.setItem("activeRideId", err.response.data.ride._id);
        localStorage.removeItem("activeRideLocation");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ride?._id) return;

    socket.emit("joinRide", ride._id);

    const applyRideEvent = (data) => {
      if (data.ride) {
        setRide(data.ride);
        if (data.ride.status === "COMPLETED") {
          localStorage.removeItem("activeRideId");
          localStorage.removeItem("activeRideLocation");
        } else {
          localStorage.setItem("activeRideId", data.ride._id);
        }
      }
    };

    const handleLocation = (data) => {
      setLocation(data);
      localStorage.setItem("activeRideLocation", JSON.stringify(data));
      if (data.ride) {
        setRide(data.ride);
        if (data.ride.status === "COMPLETED") {
          localStorage.removeItem("activeRideId");
          localStorage.removeItem("activeRideLocation");
        } else {
          localStorage.setItem("activeRideId", data.ride._id);
        }
      }
    };

    socket.on("rideAccepted", applyRideEvent);
    socket.on("rideStarted", applyRideEvent);
    socket.on("rideCompleted", applyRideEvent);
    socket.on("driverLocation", handleLocation);

    return () => {
      socket.off("rideAccepted", applyRideEvent);
      socket.off("rideStarted", applyRideEvent);
      socket.off("rideCompleted", applyRideEvent);
      socket.off("driverLocation", handleLocation);
    };
  }, [ride?._id]);

  const currentStatus = ride?.status ? statusText[ride.status] || ride.status : "";

  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "#0a0a0a" }}>
        <div className="w-full max-w-md text-center"
          style={{
            background: "#111111",
            border: "0.5px solid #2a2a2a",
            borderRadius: "20px",
            padding: "28px",
            color: "#f5f5f5"
          }}>
          Restoring active ride...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#0a0a0a" }}>

      <div className="w-full max-w-md space-y-4"
        style={{
          background: "#111111",
          border: "0.5px solid #2a2a2a",
          borderRadius: "20px",
          padding: "28px",
        }}>

        <div className="flex items-center justify-center gap-3 mb-1">
          <div style={{
            width: 32, height: 32,
            background: "#e82525",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <polyline points="2,12 6,12 8,4 11,20 14,9 17,14 19,12 22,12"
                stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: "#f5f5f5" }}>
            PulseRoute
          </h1>
        </div>

        <p style={{
          fontSize: 11, color: "#777",
          textAlign: "center", letterSpacing: "1.5px",
          textTransform: "uppercase", marginBottom: 4
        }}>
          Emergency Dispatch
        </p>

        {error && (
          <div className="bg-red-950 text-red-100 border border-red-800 p-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {!ride ? (
          <button
            onClick={handleRequestRide}
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#7a1212" : "#e82525",
              border: "none",
              borderRadius: 14,
              padding: "16px",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "background 0.15s",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>
              {loading ? "Requesting..." : "Request Ambulance"}
            </span>
          </button>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(232,37,37,0.12)",
                border: "0.5px solid rgba(232,37,37,0.3)",
                borderRadius: 20, padding: "5px 12px"
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: ride.status === "COMPLETED" ? "#22c55e" : "#e82525",
                  display: "inline-block",
                  animation: ride.status === "COMPLETED" ? "none" : "pulse 1.2s infinite"
                }}/>
                <span style={{ fontSize: 12, color: "#f87171", fontWeight: 500 }}>
                  {currentStatus}
                </span>
              </div>
            </div>

            <RideCard ride={ride} />
            <MapView location={location} ride={ride} />

            {ride.status === "COMPLETED" && (
              <button
                onClick={() => {
                  setRide(null);
                  setLocation(null);
                  setError("");
                  localStorage.removeItem("activeRideId");
                  localStorage.removeItem("activeRideLocation");
                }}
                className="w-full bg-gray-800 text-white py-3 rounded-xl"
              >
                Request Another Ambulance
              </button>
            )}
          </>
        )}

      </div>
    </div>
  );
}

export default App;
