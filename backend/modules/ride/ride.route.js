const express = require("express");
const mongoose = require("mongoose");
const Ride = require("./ride.model");
const { findNearbyDrivers } = require("../dispatch/dispatch.service");
const Driver = require("../driver/driver.model");

const router = express.Router();

module.exports = (io) => {
  const getRideWithDriver = (rideId) => (
    Ride.findById(rideId).populate("driver").lean()
  );

  router.get("/:rideId", async (req, res) => {
    try {
      const { rideId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(rideId)) {
        return res.status(400).json({ message: "Valid rideId is required" });
      }

      const ride = await getRideWithDriver(rideId);

      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      return res.json({ ride });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.post("/request", async (req, res) => {
    try {
      const { lng, lat } = req.body;

      if (lng === undefined || lat === undefined) {
        return res.status(400).json({ message: "Location required" });
      }

      const ride = await Ride.create({
        userLocation: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)]
        },
        status: "REQUESTED"
      });

      const drivers = await findNearbyDrivers(Number(lng), Number(lat));

      drivers.forEach((driver) => {
        io.to(driver._id.toString()).emit("newRide", {
          rideId: ride._id,
          ride,
          location: { lng: Number(lng), lat: Number(lat) }
        });
      });

      if (!drivers.length) {
        return res.status(404).json({
          message: "No drivers nearby",
          ride
        });
      }

      return res.json({
        message: "Ride request sent to drivers",
        ride,
        notifiedDrivers: drivers.length
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.post("/accept", async (req, res) => {
    try {
      const { rideId, driverId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(rideId) || !mongoose.Types.ObjectId.isValid(driverId)) {
        return res.status(400).json({ message: "Valid rideId and driverId are required" });
      }

      const driver = await Driver.findById(driverId);
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }

      const ride = await Ride.findOneAndUpdate(
        {
          _id: rideId,
          status: "REQUESTED"
        },
        {
          status: "DRIVER_ASSIGNED",
          driver: driverId
        },
        { returnDocument: "after", runValidators: true }
      );

      if (!ride) {
        return res.status(400).json({ message: "Ride already taken" });
      }

      await Driver.findByIdAndUpdate(
        driverId,
        { isAvailable: false },
        { returnDocument: "after", runValidators: true }
      );

      const populatedRide = await getRideWithDriver(rideId);

      io.to(rideId).emit("rideAccepted", {
        rideId,
        driverId,
        ride: populatedRide
      });

      return res.json({
        message: "Ride accepted",
        ride: populatedRide
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.post("/start", async (req, res) => {
    try {
      const { rideId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(rideId)) {
        return res.status(400).json({ message: "Valid rideId is required" });
      }

      const ride = await Ride.findOneAndUpdate(
        {
          _id: rideId,
          status: "DRIVER_ASSIGNED"
        },
        { status: "ONGOING" },
        { returnDocument: "after", runValidators: true }
      );

      if (!ride) {
        return res.status(400).json({ message: "Ride must be assigned before it can start" });
      }

      const populatedRide = await getRideWithDriver(rideId);

      io.to(rideId).emit("rideStarted", {
        rideId,
        ride: populatedRide
      });

      return res.json({
        message: "Ride started",
        ride: populatedRide
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.post("/complete", async (req, res) => {
    try {
      const { rideId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(rideId)) {
        return res.status(400).json({ message: "Valid rideId is required" });
      }

      const ride = await Ride.findOne({ _id: rideId, status: "ONGOING" }).populate("driver");

      if (!ride) {
        return res.status(400).json({ message: "Ride must be ongoing before it can complete" });
      }

      ride.status = "COMPLETED";
      await ride.save();

      if (ride.driver?._id) {
        await Driver.findByIdAndUpdate(
          ride.driver._id,
          { isAvailable: true },
          { returnDocument: "after", runValidators: true }
        );
      }

      const populatedRide = await getRideWithDriver(rideId);

      io.to(rideId).emit("rideCompleted", {
        rideId,
        ride: populatedRide
      });

      return res.json({
        message: "Ride completed",
        ride: populatedRide
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  return router;
};
