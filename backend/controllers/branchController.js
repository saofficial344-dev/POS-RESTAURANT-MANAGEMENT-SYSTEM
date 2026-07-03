import Branch from '../models/Branch.js';
import Order  from '../models/Order.js';
import Bill   from '../models/Bill.js';
import User   from '../models/User.js';
import Table  from '../models/Table.js';

// Roles allowed to see all branches (vs only their own)
const ADMIN_ROLES = new Set(['admin']);

// Auto-generate branch code: BR001, BR002, ...
const generateBranchCode = async (restaurantId) => {
  const count = await Branch.countDocuments({
    restaurantId,
    status: { $ne: 'deleted' },
  });
  return `BR${String(count + 1).padStart(3, '0')}`;
};

// ── POST /api/branches ────────────────────────────────────────────────────────
export const createBranch = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;

    // Count existing branches for isDefault determination
    const currentCount = await Branch.countDocuments({
      restaurantId,
      status: { $ne: 'deleted' },
    });

    const {
      name, branchCode, email, phone,
      address, city, state, country, postalCode,
      timezone, currency, managerId,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Branch name is required' });
    }

    // branchCode uniqueness check within restaurant
    const code = branchCode?.trim().toUpperCase() || await generateBranchCode(restaurantId);
    const codeExists = await Branch.findOne({
      restaurantId,
      branchCode: code,
      status: { $ne: 'deleted' },
    });
    if (codeExists) {
      return res.status(400).json({ message: `Branch code '${code}' is already in use` });
    }

    // First branch in restaurant → mark as default
    const isDefault = currentCount === 0;

    const branch = await Branch.create({
      restaurantId,
      name:       name.trim(),
      branchCode: code,
      email:      email?.trim()    || '',
      phone:      phone?.trim()    || '',
      address:    address?.trim()  || '',
      city:       city?.trim()     || '',
      state:      state?.trim()    || '',
      country:    country?.trim()  || 'Pakistan',
      postalCode: postalCode?.trim() || '',
      timezone:   timezone         || 'Asia/Karachi',
      currency:   currency         || 'PKR',
      managerId:  managerId        || null,
      isDefault,
      createdBy: req.user._id,
    });

    const populated = await Branch.findById(branch._id)
      .populate('managerId', 'name email role');

    res.status(201).json({ success: true, message: 'Branch created', data: populated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Branch name or code already exists in this restaurant' });
    }
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/branches ─────────────────────────────────────────────────────────
export const getBranches = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const role         = req.user?.role;
    const branchId     = req.branchId;

    const {
      search, status,
      page  = 1,
      limit = 20,
    } = req.query;

    const filter = { restaurantId, status: { $ne: 'deleted' } };

    // Non-admin roles see only their own branch
    if (!ADMIN_ROLES.has(role) && branchId) {
      filter._id = branchId;
    }

    if (status && ['active', 'inactive'].includes(status)) {
      filter.status = status;
    }

    if (search?.trim()) {
      const rx = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: rx }, { branchCode: rx }, { city: rx }];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Branch.countDocuments(filter);

    const branches = await Branch.find(filter)
      .populate('managerId', 'name email role')
      .sort({ isDefault: -1, createdAt: 1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      data: branches,
      pagination: {
        total,
        page:      Number(page),
        limit:     Number(limit),
        pages:     Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/branches/:id ─────────────────────────────────────────────────────
export const getBranch = async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id:          req.params.id,
      restaurantId: req.restaurantId,
      status:       { $ne: 'deleted' },
    }).populate('managerId', 'name email role');

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Non-admin: must be their own branch
    const role = req.user?.role;
    if (!ADMIN_ROLES.has(role) && req.branchId?.toString() !== branch._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ success: true, data: branch });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/branches/:id/stats ───────────────────────────────────────────────
export const getBranchStats = async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id:          req.params.id,
      restaurantId: req.restaurantId,
      status:       { $ne: 'deleted' },
    });
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    const branchId     = branch._id;
    const restaurantId = branch.restaurantId;

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [activeOrders, staffCount, tableCount, revenueAgg] = await Promise.all([
      Order.countDocuments({
        restaurantId,
        branchId,
        status: { $in: ['Pending', 'Cooking', 'Ready', 'Served'] },
      }),
      User.countDocuments({ restaurantId, branchId, status: 'active' }),
      Table.countDocuments({ restaurantId, branchId }),
      Bill.aggregate([
        {
          $match: {
            restaurantId,
            branchId,
            status:    'active',
            createdAt: { $gte: todayStart, $lte: todayEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
    ]);

    const dailyRevenue = revenueAgg[0]?.total ?? 0;

    res.json({
      success: true,
      data: { activeOrders, staffCount, tableCount, dailyRevenue },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── PUT /api/branches/:id ─────────────────────────────────────────────────────
export const updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id:          req.params.id,
      restaurantId: req.restaurantId,
      status:       { $ne: 'deleted' },
    });
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    const {
      name, branchCode, email, phone,
      address, city, state, country, postalCode,
      timezone, currency, managerId,
    } = req.body;

    // branchCode uniqueness (if changing)
    if (branchCode && branchCode.trim().toUpperCase() !== branch.branchCode) {
      const code = branchCode.trim().toUpperCase();
      const codeExists = await Branch.findOne({
        restaurantId: req.restaurantId,
        branchCode:   code,
        _id:          { $ne: branch._id },
        status:       { $ne: 'deleted' },
      });
      if (codeExists) {
        return res.status(400).json({ message: `Branch code '${code}' is already in use` });
      }
      branch.branchCode = code;
    }

    // name uniqueness (if changing)
    if (name && name.trim() !== branch.name) {
      const nameExists = await Branch.findOne({
        restaurantId: req.restaurantId,
        name:         name.trim(),
        _id:          { $ne: branch._id },
        status:       { $ne: 'deleted' },
      });
      if (nameExists) {
        return res.status(400).json({ message: `Branch name '${name.trim()}' is already in use` });
      }
      branch.name = name.trim();
    }

    if (email     !== undefined) branch.email      = email?.trim()    || '';
    if (phone     !== undefined) branch.phone      = phone?.trim()    || '';
    if (address   !== undefined) branch.address    = address?.trim()  || '';
    if (city      !== undefined) branch.city       = city?.trim()     || '';
    if (state     !== undefined) branch.state      = state?.trim()    || '';
    if (country   !== undefined) branch.country    = country?.trim()  || '';
    if (postalCode !== undefined) branch.postalCode = postalCode?.trim() || '';
    if (timezone  !== undefined) branch.timezone   = timezone;
    if (currency  !== undefined) branch.currency   = currency;
    if (managerId !== undefined) branch.managerId  = managerId || null;

    const updated = await branch.save();
    const populated = await Branch.findById(updated._id)
      .populate('managerId', 'name email role');

    res.json({ success: true, message: 'Branch updated', data: populated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Branch name or code already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

// ── PATCH /api/branches/:id/status ───────────────────────────────────────────
export const toggleBranchStatus = async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id:          req.params.id,
      restaurantId: req.restaurantId,
      status:       { $ne: 'deleted' },
    });
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    if (branch.isDefault && branch.status === 'active') {
      return res.status(400).json({
        message: 'Cannot deactivate the default branch. Assign another branch as default first.',
      });
    }

    branch.status = branch.status === 'active' ? 'inactive' : 'active';
    await branch.save();

    res.json({
      success: true,
      message: `Branch ${branch.status === 'active' ? 'activated' : 'deactivated'}`,
      data:    { _id: branch._id, status: branch.status },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── PATCH /api/branches/:id/set-default ──────────────────────────────────────
export const setDefaultBranch = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const branch = await Branch.findOne({
      _id: req.params.id,
      restaurantId,
      status: { $ne: 'deleted' },
    });
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }
    if (branch.status !== 'active') {
      return res.status(400).json({ message: 'Cannot set an inactive branch as default' });
    }

    // Unset all other defaults for this restaurant
    await Branch.updateMany({ restaurantId, _id: { $ne: branch._id } }, { isDefault: false });
    branch.isDefault = true;
    await branch.save();

    res.json({ success: true, message: 'Default branch updated', data: branch });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE /api/branches/:id ──────────────────────────────────────────────────
// Soft delete — marks status: 'deleted', never destroys data
export const deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id:          req.params.id,
      restaurantId: req.restaurantId,
      status:       { $ne: 'deleted' },
    });
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    if (branch.isDefault) {
      return res.status(400).json({
        message: 'Cannot delete the default branch. Assign another branch as default first.',
      });
    }

    // Prevent deletion if branch has active orders
    const activeOrders = await Order.countDocuments({
      restaurantId: req.restaurantId,
      branchId:     branch._id,
      status:       { $in: ['Pending', 'Cooking', 'Ready', 'Served'] },
    });
    if (activeOrders > 0) {
      return res.status(400).json({
        message: `Cannot delete branch with ${activeOrders} active order${activeOrders !== 1 ? 's' : ''}. Complete or cancel them first.`,
      });
    }

    branch.status = 'deleted';
    await branch.save();

    res.json({ success: true, message: 'Branch deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
