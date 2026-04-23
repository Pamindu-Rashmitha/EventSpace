const mongoose = require('mongoose');

const cateringSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    cuisine: {
      type: String,
      trim: true,
    },
    mealType: {
      type: String,
      enum: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Buffet', 'Cocktail'],
      default: 'Buffet',
    },
    menuItems: [
      {
        type: String,
        trim: true,
      },
    ],
    pricePerPerson: {
      type: Number,
      required: [true, 'Price per person is required'],
      min: [0, 'Price cannot be negative'],
      max: [500000, 'Price cannot exceed LKR 500,000'],
    },
    minServings: {
      type: Number,
      default: 10,
      min: 1,
    },
    images: [
      {
        url: { type: String },
        publicId: { type: String },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    venues: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Venue',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Catering', cateringSchema);
