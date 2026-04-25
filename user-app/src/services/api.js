import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

export const requestRide = (data) => API.post("/ride/request", data);