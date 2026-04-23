const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    guestCount: {
      type: Number,
      required: true,
      min: 1,
    },
    eventType: {
      type: String,
      trim: true,
    },
   
    bookingType: {
      type: String,
      enum: ['full_day', 'half_day'],
      default: 'full_day',
    },
    catering: [
      {
        package: { type: mongoose.Schema.Types.ObjectId, ref: 'Catering' },
        servings: { type: Number, default: 1, min: 1 },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Paid', 'Refunded'],
      default: 'Unpaid',
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'mobile', null],
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled'],
      default: 'Pending',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

bookingSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    return next(new Error('End date must be on or after the start date'));
  }
  next();
});

bookingSchema.index({ venue: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
