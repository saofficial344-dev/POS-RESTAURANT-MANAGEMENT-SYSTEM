import Table from '../models/Table.js';

export const getAllTables = async (req, res) => {
  try {
    const { section, status } = req.query;
    let filter = {};

    if (section) filter.section = section;
    if (status) filter.status = status;

    const tables = await Table.find(filter).sort({ tableNumber: 1 });

    res.status(200).json({ success: true, count: tables.length, data: tables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAvailableTables = async (req, res) => {
  try {
    const tables = await Table.find({ status: 'Available' }).sort({ tableNumber: 1 });

    res.status(200).json({ success: true, count: tables.length, data: tables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTable = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id).populate('currentOrderId');

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    res.status(200).json({ success: true, data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTable = async (req, res) => {
  try {
    const { tableNumber, capacity, section, notes } = req.body;

    if (!tableNumber || !capacity) {
      return res.status(400).json({ success: false, message: 'Please provide table number and capacity' });
    }

    const existingTable = await Table.findOne({ tableNumber });
    if (existingTable) {
      return res.status(400).json({ success: false, message: 'Table number already exists' });
    }

    const table = await Table.create({
      tableNumber,
      capacity,
      section: section || 'Indoor',
      notes,
    });

    res.status(201).json({ success: true, message: 'Table created successfully', data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTable = async (req, res) => {
  try {
    let table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const { capacity, section, notes } = req.body;

    if (capacity) table.capacity = capacity;
    if (section) table.section = section;
    if (notes) table.notes = notes;

    table = await table.save();

    res.status(200).json({ success: true, message: 'Table updated successfully', data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTable = async (req, res) => {
  try {
    const table = await Table.findByIdAndDelete(req.params.id);

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    res.status(200).json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignOrderToTable = async (req, res) => {
  try {
    const { orderId, numberOfGuests } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Please provide order ID' });
    }

    let table = await Table.findById(req.params.id).populate('currentOrderId');

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    if (table.status !== 'Available') {
      return res.status(400).json({ success: false, message: 'Table is not available' });
    }

    table.status = 'Occupied';
    table.currentOrderId = orderId;
    table.occupiedBy = {
      numberOfGuests: numberOfGuests || table.capacity,
      checkinTime: new Date(),
    };

    table = await table.save();

    res.status(200).json({ success: true, message: 'Order assigned to table', data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearTable = async (req, res) => {
  try {
    let table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    table.status = 'Available';
    table.currentOrderId = null;
    table.occupiedBy = null;
    table.needsCleaning = true;
    table.lastCleanedAt = new Date();

    table = await table.save();

    res.status(200).json({ success: true, message: 'Table cleared successfully', data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reserveTable = async (req, res) => {
  try {
    const { customerName, customerPhone, reservationTime, numberOfGuests } = req.body;

    let table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    table.status = 'Reserved';
    table.reservedFor = {
      customerName,
      customerPhone,
      reservationTime,
      numberOfGuests,
    };

    table = await table.save();

    res.status(200).json({ success: true, message: 'Table reserved successfully', data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markTableForCleaning = async (req, res) => {
  try {
    let table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    table.status = 'Maintenance';
    table.needsCleaning = true;

    table = await table.save();

    res.status(200).json({ success: true, message: 'Table marked for cleaning', data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markTableAsCleaned = async (req, res) => {
  try {
    let table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    table.status = 'Available';
    table.needsCleaning = false;
    table.lastCleanedAt = new Date();

    table = await table.save();

    res.status(200).json({ success: true, message: 'Table marked as cleaned', data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOccupancyStatus = async (req, res) => {
  try {
    const tables = await Table.find();
    const totalTables = tables.length;
    const occupiedTables = tables.filter((t) => t.status === 'Occupied').length;
    const availableTables = tables.filter((t) => t.status === 'Available').length;
    const reservedTables = tables.filter((t) => t.status === 'Reserved').length;
    const maintenanceTables = tables.filter((t) => t.status === 'Maintenance').length;

    const occupancyRate = totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        totalTables,
        occupiedTables,
        availableTables,
        reservedTables,
        maintenanceTables,
        occupancyRate: occupancyRate.toFixed(2),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};