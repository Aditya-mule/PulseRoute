import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline
} from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { getRoute } from "../services/route";

// Fix marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// 🚑 Smooth moving marker
function SmoothMarker({ location }) {
  const [pos, setPos] = useState(location);
  const map = useMap();

  // auto pan map
  useEffect(() => {
    if (pos) {
      map.panTo([pos.lat, pos.lng]);
    }
  }, [pos, map]);

  // smooth animation
  useEffect(() => {
    if (!location) return;

    const interval = setInterval(() => {
      setPos((prev) => {
        if (!prev) return location;

        return {
          lat: prev.lat + (location.lat - prev.lat) * 0.2,
          lng: prev.lng + (location.lng - prev.lng) * 0.2
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [location]);

  if (!pos) return null;

  return (
    <Marker position={[pos.lat, pos.lng]}>
      <Popup>🚑 Driver</Popup>
    </Marker>
  );
}

// 🗺️ Main Map Component
export default function MapView({ location }) {
  const user = { lat: 12.97, lng: 77.59 };

  const [routeCoords, setRouteCoords] = useState([]);
  const [eta, setEta] = useState(null);

  // 🔥 Fetch real route from OSRM
  useEffect(() => {
    if (!location) return;

    const fetchRoute = async () => {
      try {
        const route = await getRoute(
          { lat: location.lat, lng: location.lng },
          user
        );

        // convert GeoJSON → leaflet format
        const coords = route.geometry.coordinates.map((c) => [
          c[1],
          c[0]
        ]);

        setRouteCoords(coords);

        // ETA in minutes
        setEta((route.duration / 60).toFixed(1));
      } catch (err) {
        console.error("Route fetch error:", err);
      }
    };

    fetchRoute();
  }, [location]);

  return (
    <div className="space-y-2">
      <MapContainer
        center={[user.lat, user.lng]}
        zoom={15}
        className="h-64 w-full rounded-xl"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Smooth Driver Marker */}
        <SmoothMarker location={location} />

        {/* Real Route Line */}
        {routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: "red", weight: 4 }}
          />
        )}
      </MapContainer>

      {/* ETA Display */}
      {eta && (
        <div className="bg-white shadow-md p-3 rounded-xl text-center text-sm">
          ⏱️ ETA: <span className="font-semibold">{eta} min</span>
        </div>
      )}
    </div>
  );
}