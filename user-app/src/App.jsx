import { useState, useEffect } from "react";
import { requestRide } from "./services/api";
import { socket } from "./socket/socket";
import RideCard from "./components/RideCard";
import LocationCard from "./components/LocationCard";
import MapView from "./components/MapView";

function App() {
  const [ride, setRide] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRequestRide = async () => {
    setLoading(true);
    try {
      const res = await requestRide({ lng: 77.59, lat: 12.97 });
      setRide(res.data.ride);
    } catch (err) {
      alert("No drivers available");
    }
    setLoading(false);
  };

  useEffect(() => {
  if (ride?._id) {
    socket.emit("joinRide", ride._id);

    const handleLocation = (data) => {
      console.log("USER RECEIVED:", data);
      setLocation(data);
    };

    socket.on("driverLocation", handleLocation);

    return () => {
      socket.off("driverLocation", handleLocation);
    };
  }
}, [ride]);

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

        {/* Header */}
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
          fontSize: 11, color: "#555",
          textAlign: "center", letterSpacing: "1.5px",
          textTransform: "uppercase", marginBottom: 4
        }}>
          Emergency Dispatch
        </p>

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
            {/* Status pill */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(232,37,37,0.12)",
                border: "0.5px solid rgba(232,37,37,0.3)",
                borderRadius: 20, padding: "5px 12px"
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#e82525", display: "inline-block",
                  animation: "pulse 1.2s infinite"
                }}/>
                <span style={{ fontSize: 12, color: "#e82525", fontWeight: 500 }}>
                  Unit dispatched · En route
                </span>
              </div>
            </div>

            <RideCard ride={ride} />
            <MapView location={location} />
          </>
        )}

      </div>
    </div>
  );
}

export default App;