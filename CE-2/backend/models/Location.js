const mongoose = require('mongoose');
const { JsonCollection } = require('../config/jsonDb');

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

const MongoLocModel = mongoose.models.Location || mongoose.model('Location', locationSchema);
const jsonLocs = new JsonCollection('locations');

const LocProxy = new Proxy(MongoLocModel, {
  get(target, prop) {
    if (process.env.USE_JSON_DB === 'true') {
      if (typeof jsonLocs[prop] === 'function') {
        return jsonLocs[prop].bind(jsonLocs);
      }
      return jsonLocs[prop];
    }
    return target[prop];
  },
});

module.exports = LocProxy;
