
const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth", // ⚠️ change to "User" if your auth model uses that
      required: true
    },

    name: {
      type: String,
      required: true
    },

    phone: {
      type: String,
      required: true
    },

    isAvailable: {
      type: Boolean,
      default: true
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true
      }
    }
  },
  { timestamps: true } // ✅ added
);

// 🌍 Geospatial index
driverSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Driver", driverSchema);

