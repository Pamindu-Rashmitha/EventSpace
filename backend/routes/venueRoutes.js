const express = require('express');
const router = express.Router();

const {
  listVenues,
  getVenue,
  createVenue,
  updateVenue,
  deleteVenue,
  removeVenuePhoto,
} = require('../controllers/venueController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.get('/', listVenues);
router.get('/:id', getVenue);

router.post('/', protect, admin, upload.array('photos', 8), createVenue);
router.put('/:id', protect, admin, upload.array('photos', 8), updateVenue);
router.delete('/:id', protect, admin, deleteVenue);
router.delete('/:id/photos/:photoId', protect, admin, removeVenuePhoto);

module.exports = router;
