const Location = require('../models/Location');

// @desc    Get all locations
// @route   GET /api/locations
// @access  Private
const getLocations = async (req, res) => {
  try {
    const locations = await Location.find().lean();
    const result = locations.map((l) => ({ ...l, id: l._id }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get single location
// @route   GET /api/locations/:id
// @access  Private
const getLocation = async (req, res) => {
  try {
    const loc = await Location.findById(req.params.id).lean();
    if (!loc) return res.status(404).json({ message: 'Location not found' });
    res.json({ ...loc, id: loc._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create location
// @route   POST /api/locations
// @access  Admin
const createLocation = async (req, res) => {
  try {
    const { campus, block, floor, room_area } = req.body;
    if (!campus || !block || !floor || !room_area) {
      return res.status(400).json({ message: 'campus, block, floor, and room_area are required' });
    }
    const loc = await Location.create({ campus, block, floor, room_area });
    res.status(201).json({ ...loc.toObject(), id: loc._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update location
// @route   PATCH /api/locations/:id
// @access  Admin
const updateLocation = async (req, res) => {
  try {
    const loc = await Location.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!loc) return res.status(404).json({ message: 'Location not found' });
    res.json({ ...loc, id: loc._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete location
// @route   DELETE /api/locations/:id
// @access  Admin
const deleteLocation = async (req, res) => {
  try {
    const loc = await Location.findByIdAndDelete(req.params.id);
    if (!loc) return res.status(404).json({ message: 'Location not found' });
    res.json({ message: 'Location deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getLocations, getLocation, createLocation, updateLocation, deleteLocation };
