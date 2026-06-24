import Setting from "../models/Setting.js";

// GET TAXES
export const getTax = async (req, res) => {
  try {

    let setting = await Setting.findOne();

    if (!setting) {

      setting = await Setting.create({
        cashTax: 0,
        cardTax: 0,
        serviceTax: 0,
      });  

    }

    res.json(setting);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};

// UPDATE TAXES
export const updateTax = async (
  req,
  res
) => {

  try {

    const {
      cashTax,
      cardTax,
      serviceTax,
    } = req.body;

    let setting = await Setting.findOne();

    if (!setting) {

      setting = await Setting.create({
        cashTax,
        cardTax,
        serviceTax,
      });

    } else {

      setting.cashTax = cashTax;
      setting.cardTax = cardTax;
      setting.serviceTax = serviceTax;

      await setting.save();

    }

    res.json(setting);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};