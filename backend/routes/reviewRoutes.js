const express = require('express');
const router = express.Router();

const {
  createReview,
  getVenueReviews,
  getReviewStats,
  getMyReviews,
  getAllReviews,
  updateReview,
  deleteReview,
  adminDeleteReview,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

router.get('/stats', getReviewStats);
router.get('/venue/:venueId', getVenueReviews);

router.get('/my', protect, getMyReviews);
router.post('/', protect, createReview);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);

router.get('/', protect, admin, getAllReviews);
router.delete('/admin/:id', protect, admin, adminDeleteReview);

module.exports = router;
