const express = require('express');
const router = express.Router();

const {
  checkAvailability,
  createBooking,
  listBookings,
  myBookings,
  getBooking,
  updateBookingStatus,
  cancelBooking,
  deleteBooking,
  processPayment,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

router.get('/availability', checkAvailability);

router.get('/', protect, admin, listBookings);
router.get('/my', protect, myBookings);
router.get('/:id', protect, getBooking);

router.post('/', protect, createBooking);

router.put('/:id/status', protect, admin, updateBookingStatus);
router.put('/:id/cancel', protect, cancelBooking);
router.post('/:id/pay', protect, processPayment);

router.delete('/:id', protect, admin, deleteBooking);

module.exports = router;
