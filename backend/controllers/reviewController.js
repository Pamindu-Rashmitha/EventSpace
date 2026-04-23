const Review = require('../models/Review');
const Booking = require('../models/Booking');

exports.createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating || !comment) {
      return res.status(400).json({ message: 'bookingId, rating and comment are required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only review your own bookings' });
    }

    if (booking.status !== 'Confirmed') {
      return res.status(400).json({ message: 'You can only review confirmed bookings' });
    }

    const existing = await Review.findOne({ user: req.user._id, booking: bookingId });
    if (existing) {
      return res.status(400).json({ message: 'You have already reviewed this booking' });
    }

    const review = await Review.create({
      user: req.user._id,
      booking: bookingId,
      venue: booking.venue,
      rating: Number(rating),
      comment: comment.trim(),
    });

    const populated = await review.populate([
      { path: 'user', select: 'name' },
      { path: 'venue', select: 'name' },
    ]);

    return res.status(201).json(populated);
  } catch (err) {
    // Belt-and-braces: the unique index should prevent duplicates even if the
    // findOne above races with a parallel request.
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this booking' });
    }
    return res.status(500).json({ message: err.message });
  }
};

exports.getReviewStats = async (req, res) => {
  try {
    const stats = await Review.aggregate([
      {
        $group: {
          _id: '$venue',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {};
    stats.forEach((s) => {
      result[s._id] = {
        avgRating: Math.round(s.avgRating * 10) / 10,
        count: s.count,
      };
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getVenueReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ venue: req.params.venueId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    return res.json(reviews);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .populate('venue', 'name')
      .populate('booking', 'startDate endDate')
      .sort({ createdAt: -1 });

    return res.json(reviews);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'name email')
      .populate('venue', 'name')
      .sort({ createdAt: -1 });

    return res.json(reviews);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (String(review.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only edit your own reviews' });
    }

    const { rating, comment } = req.body;
    if (rating !== undefined) review.rating = Number(rating);
    if (comment !== undefined) review.comment = comment.trim();

    const updated = await review.save();
    const populated = await updated.populate([
      { path: 'user', select: 'name' },
      { path: 'venue', select: 'name' },
    ]);

    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (String(review.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own reviews' });
    }

    await review.deleteOne();
    return res.json({ message: 'Review removed' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.adminDeleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await review.deleteOne();
    return res.json({ message: 'Review removed by admin' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
