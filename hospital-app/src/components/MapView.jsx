import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline
} from "react-leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

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

// Auto move map
function AutoCenter({ location }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], 15);
    }
  }, [location]);

  return null;
}

export default function MapView({ location }) {
  if (!location) return null;

  // 🔥 Convert route [lng, lat] → [lat, lng]
  const routePositions = location.route
    ? location.route.map(([lng, lat]) => [lat, lng])
    : [];

  return (
    <MapContainer
      center={[location.lat, location.lng]}
      zoom={15}
      className="h-64 w-full rounded-xl"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <AutoCenter location={location} />

      {/* 🚑 Ambulance Marker */}
      <Marker position={[location.lat, location.lng]}>
        <Popup>🚑 Ambulance</Popup>
      </Marker>

      {/* 🔴 Route Line */}
      {routePositions.length > 0 && (
        <Polyline
          positions={routePositions}
          pathOptions={{ color: "red", weight: 4 }}
        />
      )}
    </MapContainer>
  );
}