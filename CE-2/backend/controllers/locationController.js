const Location = require('../models/Location');

// @desc    Get all locations
const getLocations = async (req, res) => {
  try {
    const locations = await Location.find().lean();
    res.json(locations.map((l) => ({ ...l, id: l._id })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc    Get single location
const getLocation = async (req, res) => {
  try {
    const loc = await Location.findById(req.params.id).lean();
    if (!loc) return res.status(404).json({ message: 'Location not found' });
    res.json({ ...loc, id: loc._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc    Create location
const createLocation = async (req, res) => {
  try {
    const { campus, block, floor, room_area } = req.body;
    if (!campus || !block || !floor || !room_area) return res.status(400).json({ message: 'campus, block, floor, and room_area are required' });
    const loc = await Location.create({ campus, block, floor, room_area });
    const obj = loc.toObject();
    res.status(201).json({ ...obj, id: obj._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc    Update location
const updateLocation = async (req, res) => {
  try {
    const loc = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
    if (!loc) return res.status(404).json({ message: 'Location not found' });
    res.json({ ...loc, id: loc._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc    Delete location
const deleteLocation = async (req, res) => {
  try {
    const loc = await Location.findByIdAndDelete(req.params.id);
    if (!loc) return res.status(404).json({ message: 'Location not found' });
    res.json({ message: 'Location deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getLocations, getLocation, createLocation, updateLocation, deleteLocation };
