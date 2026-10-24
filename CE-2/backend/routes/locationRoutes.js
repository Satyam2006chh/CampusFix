const express = require('express');
const router = express.Router();
const {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
} = require('../controllers/locationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, getLocations)
  .post(protect, authorize('admin'), createLocation);

router
  .route('/:id')
  .get(protect, getLocation)
  .patch(protect, authorize('admin'), updateLocation)
  .delete(protect, authorize('admin'), deleteLocation);

module.exports = router;
