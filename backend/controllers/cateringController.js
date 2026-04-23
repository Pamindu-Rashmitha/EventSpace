const Catering = require('../models/Catering');
const { cloudinary } = require('../middleware/uploadMiddleware');

const MAX_PRICE_LKR = 500_000;
const inPriceRange = (n) => typeof n === 'number' && !Number.isNaN(n) && n >= 0 && n <= MAX_PRICE_LKR;

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

    const ppp = Number(pricePerPerson);
    if (!inPriceRange(ppp) || ppp <= 0) {
      return res.status(400).json({
        message: `Price per person must be greater than 0 and at most LKR ${MAX_PRICE_LKR.toLocaleString()}.`,
      });
    }

    const pkg = await Catering.create({
      name,
      description,
      cuisine,
      mealType,
      pricePerPerson: ppp,
      minServings,
      venues: parsedVenues,
      menuItems: parseMenuItems(req.body.menuItems),
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
      const p = Number(pkg.pricePerPerson);
      if (!inPriceRange(p) || p <= 0) {
        return res.status(400).json({
          message: `Price per person must be greater than 0 and at most LKR ${MAX_PRICE_LKR.toLocaleString()}.`,
        });
      }
      pkg.pricePerPerson = p;
    }

    if (req.body.menuItems !== undefined) {
      pkg.menuItems = parseMenuItems(req.body.menuItems);
    }
    
    if (req.body.venues !== undefined) {
      try {
        pkg.venues = JSON.parse(req.body.venues);
      } catch {
        pkg.venues = Array.isArray(req.body.venues) ? req.body.venues : [];
      }
    }

    if (req.files && req.files.length > 0) {
      // New uploads replace the old ones, so clean up Cloudinary first.
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
