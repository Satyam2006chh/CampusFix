const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    campus: {
      type: String,
      required: [true, 'Campus is required'],
      trim: true,
    },
    block: {
      type: String,
      required: [true, 'Block is required'],
      trim: true,
    },
    floor: {
      type: String,
      required: [true, 'Floor is required'],
      trim: true,
    },
    room_area: {
      type: String,
      required: [true, 'Room/Area is required'],
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Location', locationSchema);
