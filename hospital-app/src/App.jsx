import { useEffect, useState } from "react";
import { socket } from "./socket/socket";
import MapView from "./components/MapView";

function App() {
  const [location, setLocation] = useState(null);
  const [rideId, setRideId] = useState("");
  const [inputRideId, setInputRideId] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!rideId) return;

    console.log("Joining ride:", rideId);

    socket.emit("joinRide", rideId);
    setConnected(true);

    const handleLocation = (data) => {
      console.log("📡 RECEIVED:", data);
      setLocation(data);
    };

    socket.on("driverLocation", handleLocation);

    return () => {
      socket.off("driverLocation", handleLocation);
    };
  }, [rideId]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow space-y-4">

        <h1 className="text-xl font-bold text-center text-green-600">
          🏥 Hospital Dashboard
        </h1>

        {/* Input */}
        <input
          type="text"
          placeholder="Enter Ride ID"
          value={inputRideId}
          onChange={(e) => setInputRideId(e.target.value)}
          className="w-full p-2 border rounded"
        />

        {/* Connect Button */}
        <button
          onClick={() => {
            if (!inputRideId) {
              alert("Enter Ride ID");
              return;
            }
            setRideId(inputRideId);
          }}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded"
        >
          Connect
        </button>

        {/* Status */}
        {connected && (
          <p className="text-green-600 text-sm text-center">
            ✅ Connected to Ride: {rideId}
          </p>
        )}

        {/* Waiting */}
        {connected && !location && (
          <p className="text-center text-gray-500">
            Waiting for ambulance data...
          </p>
        )}

        {/* 🚀 MAP + DATA */}
        {location && (
          <>
            {/* 🗺️ Map */}
            <MapView location={location} />

            {/* 📊 Info */}
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-semibold">🚑 Ambulance Incoming</p>
              <p>Lat: {location.lat}</p>
              <p>Lng: {location.lng}</p>

              {location.eta && (
                <p className="text-red-500 font-bold">
                  ⏱️ ETA: {location.eta} mins
                </p>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default App;