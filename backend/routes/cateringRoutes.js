const express = require('express');
const router = express.Router();

const {
  listCatering,
  getCatering,
  createCatering,
  updateCatering,
  deleteCatering,
  removeCateringPhoto,
} = require('../controllers/cateringController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.get('/', listCatering);
router.get('/:id', getCatering);

router.post('/', protect, admin, upload.array('images', 5), createCatering);
router.put('/:id', protect, admin, upload.array('images', 5), updateCatering);
router.delete('/:id', protect, admin, deleteCatering);
router.delete('/:id/photos/:photoId', protect, admin, removeCateringPhoto);

module.exports = router;
