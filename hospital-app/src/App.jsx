import { useEffect, useState } from "react";
import { socket } from "./socket/socket";
import MapView from "./components/MapView";
import { getRide } from "./services/api";

const statusLabel = {
  REQUESTED: "Waiting for assignment",
  DRIVER_ASSIGNED: "Ambulance assigned",
  ONGOING: "Ambulance en route",
  COMPLETED: "Ride completed"
};

function App() {
  const [location, setLocation] = useState(null);
  const [ride, setRide] = useState(null);
  const [rideId, setRideId] = useState("");
  const [inputRideId, setInputRideId] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const connectToRide = async () => {
    if (!inputRideId.trim()) {
      setError("Enter Ride ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await getRide(inputRideId.trim());
      setRide(res.data.ride);
      setRideId(inputRideId.trim());
      setConnected(true);
      setLocation(null);
    } catch (err) {
      setError(err.message || "Unable to connect to ride");
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!rideId) return;

    socket.emit("joinRide", rideId);

    const applyRideEvent = (data) => {
      if (data.ride) {
        setRide(data.ride);
      }
    };

    const handleLocation = (data) => {
      setLocation(data);
      if (data.ride) {
        setRide(data.ride);
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
  }, [rideId]);

  const driver = ride?.driver || location?.driver;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow space-y-4">
        <h1 className="text-xl font-bold text-center text-green-600">
          Hospital Dashboard
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Enter Ride ID"
          value={inputRideId}
          onChange={(e) => setInputRideId(e.target.value)}
          className="w-full p-2 border rounded"
        />

        <button
          onClick={connectToRide}
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? "Connecting..." : "Connect"}
        </button>

        {connected && ride && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
            <p className="text-green-700 text-sm font-semibold">
              Connected to Ride: {rideId}
            </p>
            <p className="text-sm text-gray-700">
              Status: <span className="font-semibold">{statusLabel[ride.status] || ride.status}</span>
            </p>
            {driver && (
              <div className="mt-2 text-sm text-gray-700">
                <p className="font-semibold">Assigned Driver</p>
                <p>{driver.name}</p>
                <p>{driver.phone}</p>
              </div>
            )}
          </div>
        )}

        {connected && !location && ride?.status !== "COMPLETED" && (
          <p className="text-center text-gray-500">
            Waiting for ambulance data...
          </p>
        )}

        {location && (
          <>
            <MapView location={location} />

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-semibold">
                {ride?.status === "COMPLETED" ? "Ambulance trip completed" : "Ambulance incoming"}
              </p>
              <p>Lat: {location.lat}</p>
              <p>Lng: {location.lng}</p>

              {location.eta && ride?.status !== "COMPLETED" && (
                <p className="text-red-500 font-bold">
                  ETA: {location.eta} mins
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
