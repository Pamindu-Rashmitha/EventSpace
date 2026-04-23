const mongoose = require('mongoose');

const VENUE_TYPE_ENUM = ['Event Hall', 'Meeting Room', 'Conference Room', 'Banquet Hall', 'Outdoor'];

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Venue name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    types: {
      type: [String],
      default: undefined,
    },
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String },
      country: { type: String, default: 'N/A' },
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: 1,
    },
    pricePerDay: {
      type: Number,
      required: [true, 'Price per day is required'],
      min: [0, 'Price cannot be negative'],
      max: [500000, 'Price cannot exceed LKR 500,000'],
    },
    pricePerHalfDay: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      max: [500000, 'Price cannot exceed LKR 500,000'],
      default: 0,
    },
    openTime: {
      type: String,
      default: '09:00',
      trim: true,
    },
    closeTime: {
      type: String,
      default: '18:00',
      trim: true,
    },
    amenities: [
      {
        type: String,
        trim: true,
      },
    ],
    photos: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

function fillTypes(doc) {
  let t = doc.get('types');
  if (!t || !Array.isArray(t) || t.length === 0) {
    const legacy = doc._doc && doc._doc.type;
    t = legacy && VENUE_TYPE_ENUM.includes(String(legacy)) ? [String(legacy)] : ['Event Hall'];
  }
  t = [...new Set(t.filter((x) => VENUE_TYPE_ENUM.includes(x)))];
  const out = t.length ? t : ['Event Hall'];
  doc.set('types', out);
}

venueSchema.post('init', function () {
  fillTypes(this);
});

venueSchema.pre('validate', function (next) {
  fillTypes(this);
  next();
});

const Venue = mongoose.model('Venue', venueSchema);
module.exports = Venue;
module.exports.VENUE_TYPE_ENUM = VENUE_TYPE_ENUM;
