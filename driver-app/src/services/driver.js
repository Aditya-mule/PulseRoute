import API from "./api";
import axios from "axios";

export const updateLocation = (data) =>
  API.post("/driver/update-location", data);

export const getDriverProfile = async () => {
  const token = localStorage.getItem("token");

  return axios.get("http://localhost:5000/api/driver/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const setAvailability = async (isAvailable) => {
  const token = localStorage.getItem("token");

  return axios.post(
    "http://localhost:5000/api/driver/set-availability",
    { isAvailable },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
};