export default function LocationCard({ location }) {
  return (
    <div className="p-4 bg-gray-50 border rounded-xl">
      <h2 className="font-semibold mb-2">📍 Driver Location</h2>

      {location ? (
        <p>
          Lat: {location.lat} <br />
          Lng: {location.lng}
        </p>
      ) : (
        <p className="text-gray-500">Waiting for driver...</p>
      )}
    </div>
  );
}