const Catering = require('../models/Catering');
const { cloudinary } = require('../middleware/uploadMiddleware');

const MAX_PRICE_LKR = 500_000;
const ONLY_DIGITS_NAME = /^\d+$/;
const inPriceRange = (n) => typeof n === 'number' && !Number.isNaN(n) && n >= 0 && n <= MAX_PRICE_LKR;

function validateCateringPayload({
  name,
  description,
  menuItems,
  minServings,
  venues,
  imageCount,
  pricePerPerson,
}) {
  const n = String(name || '').trim();
  if (!n) return 'Package name is required.';
  if (n.length < 3) return 'Package name must be at least 3 characters.';
  if (n.length > 80) return 'Package name cannot exceed 80 characters.';
  if (ONLY_DIGITS_NAME.test(n)) return 'Package name cannot consist only of numbers.';

  const d = String(description || '').trim();
  if (!d) return 'Description is required.';

  const items = menuItems || [];
  if (!Array.isArray(items) || !items.length) return 'At least one menu item is required.';

  const ms = Number(minServings);
  if (minServings === undefined || minServings === null || String(minServings).trim() === '') {
    return 'Min servings is required.';
  }
  if (!Number.isInteger(ms) || ms < 1) return 'Min servings must be a whole number of at least 1.';
  if (ms > 10000) return 'Min servings seems too high (max 10,000).';

  const v = venues || [];
  if (!Array.isArray(v) || !v.length) return 'At least one venue must be selected.';

  const ic = Number(imageCount);
  if (!Number.isFinite(ic) || ic < 1) return 'At least one photo is required.';

  const ppp = Number(pricePerPerson);
  if (Number.isNaN(ppp)) return 'Price per person is required.';
  if (ppp < 0) return 'Price cannot be negative.';
  if (ppp === 0 || !inPriceRange(ppp)) {
    return `Price per person must be greater than 0 and at most LKR ${MAX_PRICE_LKR.toLocaleString()}.`;
  }

  return null;
}

const parseMenuItems = (raw) => {
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
    .map((i) => i.trim())
    .filter(Boolean);
};

exports.listCatering = async (req, res) => {
  try {
    const { mealType, q, venueId } = req.query;
    const filter = { isActive: true };
    if (mealType) filter.mealType = mealType;
    if (q) filter.name = new RegExp(q, 'i');
    if (venueId) filter.venues = venueId;

    const packages = await Catering.find(filter).populate('venues', 'name').sort({ name: 1 });
    return res.json(packages);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getCatering = async (req, res) => {
  try {
    const pkg = await Catering.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Catering package not found' });
    return res.json(pkg);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.createCatering = async (req, res) => {
  try {
    let { name, description, cuisine, mealType, pricePerPerson, minServings, venues } = req.body;

    let parsedVenues = [];
    if (venues) {
      try {
        parsedVenues = JSON.parse(venues);
      } catch {
        parsedVenues = Array.isArray(venues) ? venues : [];
      }
    }

    const images = (req.files || []).map((f) => ({
      url: f.path,
      publicId: f.filename,
    }));

    const menuItemsArr = parseMenuItems(req.body.menuItems);
    const msNum = minServings === '' || minServings === undefined ? NaN : Number(minServings);

    const errMsg = validateCateringPayload({
      name,
      description,
      menuItems: menuItemsArr,
      minServings: Number.isInteger(msNum) ? msNum : minServings,
      venues: parsedVenues,
      imageCount: images.length,
      pricePerPerson,
    });
    if (errMsg) return res.status(400).json({ message: errMsg });

    const pkg = await Catering.create({
      name,
      description,
      cuisine,
      mealType,
      pricePerPerson: Number(pricePerPerson),
      minServings: msNum,
      venues: parsedVenues,
      menuItems: menuItemsArr,
      images,
    });

    return res.status(201).json(pkg);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateCatering = async (req, res) => {
  try {
    const pkg = await Catering.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Catering package not found' });

    const updatable = [
      'name',
      'description',
      'cuisine',
      'mealType',
      'pricePerPerson',
      'minServings',
      'isActive',
    ];
    updatable.forEach((key) => {
      if (req.body[key] !== undefined) pkg[key] = req.body[key];
    });

    if (pkg.pricePerPerson != null) {
      pkg.pricePerPerson = Number(pkg.pricePerPerson);
    }

    if (req.body.menuItems !== undefined) {
      pkg.menuItems = parseMenuItems(req.body.menuItems);
    }

    if (req.body.minServings !== undefined && req.body.minServings !== '') {
      pkg.minServings = Number(req.body.minServings);
    }

    if (req.body.venues !== undefined) {
      try {
        pkg.venues = JSON.parse(req.body.venues);
      } catch {
        pkg.venues = Array.isArray(req.body.venues) ? req.body.venues : [];
      }
    }

    if (req.files && req.files.length > 0) {
      if (pkg.images && pkg.images.length > 0 && cloudinary?.uploader) {
        await Promise.all(
          pkg.images
            .filter((img) => img.publicId)
            .map((img) => cloudinary.uploader.destroy(img.publicId).catch(() => null))
        );
      }
      pkg.images = req.files.map((f) => ({
        url: f.path,
        publicId: f.filename,
      }));
    }

    const errMsg = validateCateringPayload({
      name: pkg.name,
      description: pkg.description,
      menuItems: pkg.menuItems,
      minServings: pkg.minServings,
      venues: pkg.venues,
      imageCount: (pkg.images || []).length,
      pricePerPerson: pkg.pricePerPerson,
    });
    if (errMsg) return res.status(400).json({ message: errMsg });

    const updated = await pkg.save();
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteCatering = async (req, res) => {
  try {
    const pkg = await Catering.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Catering package not found' });

    if (pkg.images && pkg.images.length > 0 && cloudinary?.uploader) {
      await Promise.all(
        pkg.images
          .filter((img) => img.publicId)
          .map((img) => cloudinary.uploader.destroy(img.publicId).catch(() => null))
      );
    }

    await pkg.deleteOne();
    return res.json({ message: 'Catering package removed' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.removeCateringPhoto = async (req, res) => {
  try {
    const pkg = await Catering.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Catering package not found' });

    if (!pkg.images || pkg.images.length <= 1) {
      return res.status(400).json({
        message: 'At least one photo is required. Upload a new photo before removing this one.',
      });
    }

    const photo = pkg.images.id(req.params.photoId);
    if (!photo) return res.status(404).json({ message: 'Photo not found' });

    if (photo.publicId && cloudinary && cloudinary.uploader) {
      await cloudinary.uploader.destroy(photo.publicId).catch(() => null);
    }

    photo.deleteOne();
    await pkg.save();
    return res.json(pkg);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
