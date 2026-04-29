const Venue = require('../models/Venue');
const { VENUE_TYPE_ENUM } = require('../models/Venue');
const { cloudinary } = require('../middleware/uploadMiddleware');

const MAX_PRICE_LKR = 500_000;
const ONLY_DIGITS = /^\d+$/;

const inPriceRange = (n) => typeof n === 'number' && !Number.isNaN(n) && n >= 0 && n <= MAX_PRICE_LKR;


function validateVenueContent({ name, location, amenities, photoCount }) {
  const n = String(name || '').trim();
  if (!n) return 'Venue name is required.';
  if (n.length < 3) return 'Venue name must be at least 3 characters.';
  if (n.length > 100) return 'Venue name cannot exceed 100 characters.';
  if (ONLY_DIGITS.test(n)) return 'Venue name cannot consist only of numbers.';

  const addr = String(location?.address || '').trim();
  if (!addr) return 'Address is required.';
  if (addr.length < 5) return 'Please enter a complete address.';
  if (ONLY_DIGITS.test(addr)) return 'Address cannot consist only of numbers.';

  const am = amenities || [];
  if (!Array.isArray(am) || !am.length) return 'At least one amenity is required.';

  const pc = Number(photoCount);
  if (!Number.isFinite(pc) || pc < 1) return 'At least one photo is required.';

  return null;
}

const parseTypes = (raw, legacyType) => {
  let list = [];
  if (raw != null && raw !== '') {
    if (Array.isArray(raw)) {
      list = raw.map(String).map((s) => s.trim());
    } else if (typeof raw === 'string') {
      const t = raw.trim();
      if (t.startsWith('[')) {
        try {
          const p = JSON.parse(t);
          if (Array.isArray(p)) list = p.map((x) => String(x).trim());
        } catch {
          list = [];
        }
      } else {
        list = [t];
      }
    }
  }
  list = list.filter((x) => VENUE_TYPE_ENUM.includes(x));
  if (!list.length && legacyType && VENUE_TYPE_ENUM.includes(String(legacyType))) {
    list = [String(legacyType)];
  }
  if (!list.length) list = ['Event Hall'];
  return [...new Set(list)];
};

const normalizeVenue = (doc) => {
  if (!doc) return doc;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  if (!o.types || o.types.length === 0) {
    o.types = o.type && VENUE_TYPE_ENUM.includes(String(o.type)) ? [o.type] : ['Event Hall'];
  } else {
    o.types = parseTypes(o.types, null);
  }
  delete o.type;
  return o;
};

const parseLocation = (raw) => {
  if (!raw) return undefined;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const parseAmenities = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }
  return String(raw)
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
};

exports.listVenues = async (req, res) => {
  try {
    const { city, minCapacity, type, q } = req.query;
    const filter = { isActive: true };

    if (city) filter['location.city'] = new RegExp(`^${city}$`, 'i');
    if (type) {
      filter.$or = [{ types: type }, { type: type }];
    }
    if (minCapacity) filter.capacity = { $gte: Number(minCapacity) };
    if (q) filter.name = new RegExp(q, 'i');

    const venues = await Venue.find(filter).lean().sort({ createdAt: -1 });
    return res.json(venues.map(normalizeVenue));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getVenue = async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id).lean();
    if (!venue) return res.status(404).json({ message: 'Venue not found' });
    return res.json(normalizeVenue(venue));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.createVenue = async (req, res) => {
  try {
    const { name, description, capacity, pricePerDay, pricePerHalfDay, openTime, closeTime } = req.body;
    const types = parseTypes(req.body.types, req.body.type);

    const photos = (req.files || []).map((f) => ({
      url: f.path,
      publicId: f.filename,
    }));

    const location =
      parseLocation(req.body.location) || {
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        country: req.body.country,
      };
    const amenitiesArr = parseAmenities(req.body.amenities);

    const contentErr = validateVenueContent({
      name,
      location,
      amenities: amenitiesArr,
      photoCount: photos.length,
    });
    if (contentErr) return res.status(400).json({ message: contentErr });

    const dayNum = Number(pricePerDay);
    const halfNum = pricePerHalfDay != null && pricePerHalfDay !== '' ? Number(pricePerHalfDay) : 0;
    if (!inPriceRange(dayNum)) {
      return res
        .status(400)
        .json({ message: `Price per day must be between 0 and LKR ${MAX_PRICE_LKR.toLocaleString()}.` });
    }
    if (!inPriceRange(halfNum)) {
      return res
        .status(400)
        .json({ message: `Price per half day must be between 0 and LKR ${MAX_PRICE_LKR.toLocaleString()}.` });
    }

    const venue = await Venue.create({
      name,
      description,
      types,
      capacity,
      pricePerDay: dayNum,
      pricePerHalfDay: halfNum,
      openTime: openTime != null && String(openTime).trim() ? String(openTime).trim() : '09:00',
      closeTime: closeTime != null && String(closeTime).trim() ? String(closeTime).trim() : '18:00',
      location,
      amenities: amenitiesArr,
      photos,
      createdBy: req.user?._id,
    });

    return res.status(201).json(normalizeVenue(venue));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateVenue = async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ message: 'Venue not found' });

    const updatable = [
      'name',
      'description',
      'capacity',
      'pricePerDay',
      'pricePerHalfDay',
      'openTime',
      'closeTime',
      'isActive',
    ];
    updatable.forEach((key) => {
      if (req.body[key] !== undefined) {
        if (key === 'pricePerHalfDay') {
          venue[key] = req.body[key] === '' ? 0 : Number(req.body[key]);
        } else {
          venue[key] = req.body[key];
        }
      }
    });

    if (req.body.types !== undefined || req.body.type !== undefined) {
      venue.types = parseTypes(req.body.types, req.body.type);
    }

    if (venue.pricePerDay != null && !inPriceRange(Number(venue.pricePerDay))) {
      return res
        .status(400)
        .json({ message: `Price per day must be between 0 and LKR ${MAX_PRICE_LKR.toLocaleString()}.` });
    }
    if (venue.pricePerHalfDay != null && !inPriceRange(Number(venue.pricePerHalfDay))) {
      return res
        .status(400)
        .json({ message: `Price per half day must be between 0 and LKR ${MAX_PRICE_LKR.toLocaleString()}.` });
    }

    const loc = parseLocation(req.body.location);
    if (loc) venue.location = { ...venue.location.toObject?.(), ...loc };
    if (req.body.amenities !== undefined) venue.amenities = parseAmenities(req.body.amenities);

    if (req.files && req.files.length > 0) {
      const newPhotos = req.files.map((f) => ({ url: f.path, publicId: f.filename }));
      venue.photos = [...venue.photos, ...newPhotos];
    }

    const locPlain = venue.location?.toObject ? venue.location.toObject() : venue.location;
    const contentErr = validateVenueContent({
      name: venue.name,
      location: locPlain,
      amenities: venue.amenities,
      photoCount: (venue.photos || []).length,
    });
    if (contentErr) return res.status(400).json({ message: contentErr });

    const updated = await venue.save();
    return res.json(normalizeVenue(updated));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteVenue = async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ message: 'Venue not found' });

    if (cloudinary && cloudinary.uploader) {
      await Promise.all(
        (venue.photos || [])
          .filter((p) => p.publicId)
          .map((p) => cloudinary.uploader.destroy(p.publicId).catch(() => null))
      );
    }

    await venue.deleteOne();
    return res.json({ message: 'Venue removed' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.removeVenuePhoto = async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ message: 'Venue not found' });

    if (!venue.photos || venue.photos.length <= 1) {
      return res.status(400).json({
        message: 'At least one photo is required. Upload a new photo before removing this one.',
      });
    }

    const photo = venue.photos.id(req.params.photoId);
    if (!photo) return res.status(404).json({ message: 'Photo not found' });

    if (photo.publicId && cloudinary && cloudinary.uploader) {
      await cloudinary.uploader.destroy(photo.publicId).catch(() => null);
    }

    photo.deleteOne();
    await venue.save();
    return res.json(normalizeVenue(venue));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
