const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema(
  {
    longUrl: {
      type: String,
      required: [true, 'Long URL is required'],
      trim: true,
      index: true,
    },
    shortCode: {
      type: String,
      required: [true, 'Short code is required'],
      unique: true,
      index: true,
    },
    clicks: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookups
urlSchema.index({ longUrl: 1 }, { unique: true });

module.exports = mongoose.model('Url', urlSchema);
