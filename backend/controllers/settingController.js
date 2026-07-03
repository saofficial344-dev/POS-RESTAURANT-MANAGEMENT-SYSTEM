import Setting from '../models/Setting.js';

// GET /api/settings/tax
export const getTax = async (req, res) => {
  try {
    const restaurantId = req.restaurantId || null;

    let setting = await Setting.findOne({ restaurantId });
    if (!setting) {
      setting = await Setting.create({
        restaurantId,
        cashTax:    0,
        cardTax:    0,
        serviceTax: 0,
      });
    }

    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/settings/tax
export const updateTax = async (req, res) => {
  try {
    const { cashTax, cardTax, serviceTax } = req.body;
    const restaurantId = req.restaurantId || null;

    let setting = await Setting.findOne({ restaurantId });
    if (!setting) {
      setting = await Setting.create({
        restaurantId,
        cashTax,
        cardTax,
        serviceTax,
      });
    } else {
      setting.cashTax    = cashTax;
      setting.cardTax    = cardTax;
      setting.serviceTax = serviceTax;
      await setting.save();
    }

    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
