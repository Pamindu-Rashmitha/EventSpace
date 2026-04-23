const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Venue = require('../models/Venue');
const Catering = require('../models/Catering');

const dayMs = 24 * 60 * 60 * 1000;
const ISO_YMD = /^\d{4}-\d{2}-\d{2}$/;

// Bookings are day-based — any part of a calendar day blocks the whole day.
// We expand to inclusive UTC day bounds so two bookings on the same date always
// conflict, regardless of the time-of-day the client happened to send.
const toInclusiveDayRange = (startInput, endInput) => {
  if (typeof startInput === 'string' && typeof endInput === 'string' && ISO_YMD.test(startInput) && ISO_YMD.test(endInput)) {
    const [ys, ms, ds] = startInput.split('-').map(Number);
    const [ye, me, de] = endInput.split('-').map(Number);
    const start = new Date(Date.UTC(ys, ms - 1, ds, 0, 0, 0, 0));
    const end = new Date(Date.UTC(ye, me - 1, de, 23, 59, 59, 999));
    if (end < start) {
      return toInclusiveDayRange(endInput, startInput);
    }
    return { start, end };
  }
  const a = new Date(startInput);
  const b = new Date(endInput);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    throw new Error('Invalid start or end date');
  }
  const lo = a <= b ? a : b;
  const hi = a <= b ? b : a;
  const start = new Date(Date.UTC(lo.getUTCFullYear(), lo.getUTCMonth(), lo.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(hi.getUTCFullYear(), hi.getUTCMonth(), hi.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
};

const inclusiveDayCount = (start, end) => {
  const a = new Date(start);
  const b = new Date(end);
  const aU = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bU = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.max(1, Math.round((bU - aU) / dayMs) + 1);
};

const calculateTotal = async ({ venue, startDate, endDate, catering = [], guestCount, bookingType = 'full_day' }) => {
  const { start, end } = toInclusiveDayRange(startDate, endDate);
  const days = inclusiveDayCount(start, end);

  const isHalf = bookingType === 'half_day';
  const rate = isHalf ? Number(venue.pricePerHalfDay) || 0 : Number(venue.pricePerDay) || 0;
  let total = rate * days;

  if (catering.length) {
    const ids = catering.map((c) => c.package);
    const docs = await Catering.find({ _id: { $in: ids } });
    catering.forEach(({ package: pkgId, servings }) => {
      const doc = docs.find((d) => String(d._id) === String(pkgId));
      if (doc) total += doc.pricePerPerson * (servings || guestCount || doc.minServings);
    });
  }

  return Math.round(total * 100) / 100;
};

const isOverlapping = async (venueId, startDate, endDate, excludeId) => {
  const { start, end } = toInclusiveDayRange(startDate, endDate);
  const filter = {
    venue: venueId,
    status: { $in: ['Pending', 'Confirmed'] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const conflict = await Booking.findOne(filter);
  return Boolean(conflict);
};

exports.checkAvailability = async (req, res) => {
  try {
    const { venueId, startDate, endDate } = req.query;
    if (!venueId || !startDate || !endDate) {
      return res.status(400).json({ message: 'venueId, startDate and endDate are required' });
    }
    const conflict = await isOverlapping(venueId, startDate, endDate);
    return res.json({ available: !conflict });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const {
      venue: venueId,
      startDate,
      endDate,
      guestCount,
      eventType,
      catering = [],
      notes,
      bookingType: bookingTypeRaw,
    } = req.body;

    if (!venueId || !startDate || !endDate || !guestCount) {
      return res.status(400).json({ message: 'venue, startDate, endDate and guestCount are required' });
    }

    const bookingType = bookingTypeRaw === 'half_day' ? 'half_day' : 'full_day';

    const venue = await Venue.findById(venueId);
    if (!venue || !venue.isActive) return res.status(404).json({ message: 'Venue not found' });

    if (bookingType === 'half_day' && (!Number(venue.pricePerHalfDay) || Number(venue.pricePerHalfDay) <= 0)) {
      return res
        .status(400)
        .json({ message: 'This venue does not offer half-day pricing. Choose full day or contact the admin.' });
    }

    if (guestCount > venue.capacity) {
      return res
        .status(400)
        .json({ message: `Guest count exceeds venue capacity (${venue.capacity})` });
    }

    let range;
    try {
      range = toInclusiveDayRange(startDate, endDate);
    } catch (e) {
      return res.status(400).json({ message: e.message || 'Invalid dates' });
    }

    const conflict = await isOverlapping(venueId, startDate, endDate);
    if (conflict) {
      return res.status(409).json({ message: 'Venue is already booked for the selected dates' });
    }

    const totalPrice = await calculateTotal({
      venue,
      startDate: range.start,
      endDate: range.end,
      catering,
      guestCount,
      bookingType,
    });

    const booking = await Booking.create({
      user: req.user._id,
      venue: venueId,
      startDate: range.start,
      endDate: range.end,
      guestCount,
      eventType,
      catering,
      totalPrice,
      notes,
      status: 'Pending',
      bookingType,
    });

    const populated = await booking.populate([
      { path: 'venue', select: 'name location pricePerDay pricePerHalfDay openTime closeTime photos' },
      { path: 'catering.package', select: 'name pricePerPerson' },
    ]);

    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.processPayment = async (req, res) => {
  try {
    const { paymentMethod, cardNumber, cardHolder, expiryDate, cvv, mobileNumber } = req.body;

    if (!paymentMethod || !['card', 'mobile'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method. Use "card" or "mobile".' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isOwner = String(booking.user) === String(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.paymentStatus === 'Paid') {
      return res.status(400).json({ message: 'Booking is already paid' });
    }

    if (booking.status === 'Cancelled') {
      return res.status(400).json({ message: 'Cannot pay for a cancelled booking' });
    }

    // Fake a gateway round-trip so the UI spinner feels real.
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1500));

    // Test hook: any card ending in 0000 always declines.
    if (paymentMethod === 'card' && cardNumber && cardNumber.replace(/\s/g, '').endsWith('0000')) {
      return res.status(402).json({
        message: 'Payment declined. Your card was rejected by the issuer.',
        code: 'CARD_DECLINED',
      });
    }

    booking.paymentStatus = 'Paid';
    booking.paymentMethod = paymentMethod;
    booking.paidAt = new Date();
    await booking.save();

    const populated = await booking.populate([
      { path: 'venue', select: 'name location pricePerDay pricePerHalfDay openTime closeTime photos' },
      { path: 'catering.package', select: 'name pricePerPerson' },
    ]);

    return res.json({
      message: 'Payment successful',
      transactionId: 'TXN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      booking: populated,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.listBookings = async (req, res) => {
  try {
    const { status, venue } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (venue && mongoose.isValidObjectId(venue)) filter.venue = venue;

    const bookings = await Booking.find(filter)
      .populate('user', 'name email phone')
      .populate('venue', 'name location pricePerDay pricePerHalfDay openTime closeTime')
      .populate('catering.package', 'name pricePerPerson')
      .sort({ createdAt: -1 });

    return res.json(bookings);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.myBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('venue', 'name location pricePerDay pricePerHalfDay openTime closeTime photos')
      .populate('catering.package', 'name pricePerPerson')
      .sort({ createdAt: -1 });

    return res.json(bookings);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('venue')
      .populate('catering.package');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isOwner = String(booking.user._id) === String(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (status === 'Confirmed') {
      const conflict = await isOverlapping(
        booking.venue,
        booking.startDate,
        booking.endDate,
        booking._id
      );
      if (conflict) {
        const other = await Booking.findOne({
          _id: { $ne: booking._id },
          venue: booking.venue,
          status: 'Confirmed',
          startDate: { $lte: booking.endDate },
          endDate: { $gte: booking.startDate },
        });
        if (other) {
          return res
            .status(409)
            .json({ message: 'Another confirmed booking overlaps these dates' });
        }
      }
    }

    booking.status = status;
    await booking.save();

    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isOwner = String(booking.user) === String(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.status === 'Cancelled') {
      return res.status(400).json({ message: 'Booking already cancelled' });
    }

    if (booking.status === 'Confirmed') {
      return res
        .status(400)
        .json({ message: 'Confirmed bookings cannot be cancelled. Please contact the admin.' });
    }

    booking.status = 'Cancelled';
    await booking.save();

    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    if (booking.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending bookings can be deleted' });
    }

    await booking.deleteOne();
    return res.json({ message: 'Booking removed' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
