const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    userLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null
    },
    status: {
      type: String,
      enum: ["REQUESTED", "DRIVER_ASSIGNED", "ONGOING", "COMPLETED"],
      default: "REQUESTED"
    }
  },
  { timestamps: true }
);

rideSchema.index({ userLocation: "2dsphere" });

module.exports = mongoose.model("Ride", rideSchema);
