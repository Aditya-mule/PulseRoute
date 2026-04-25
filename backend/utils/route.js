const axios = require("axios");

exports.getRoute = async (from, to) => {
  try {
    const url = `http://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

    const res = await axios.get(url);

    const route = res.data.routes[0];

    return {
      eta: Math.round(route.duration / 60), // minutes
      geometry: route.geometry.coordinates // [lng, lat]
    };

  } catch (err) {
    console.error("OSRM error:", err.message);
    return null;
  }
};