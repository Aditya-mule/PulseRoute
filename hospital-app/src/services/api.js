const API_BASE_URL = "http://localhost:5000/api";

export const getRide = async (rideId) => {
  const res = await fetch(`${API_BASE_URL}/ride/${rideId}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Unable to fetch ride");
  }

  return { data };
};
