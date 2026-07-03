import User from '../models/User.js';

const tf = (req) => ({ restaurantId: req.restaurantId || null });

export const getEmployees = async (req, res) => {
  try {
    const employees = await User.find(tf(req));
    res.status(200).json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployee = async (req, res) => {
  try {
    const employee = await User.findOne({ ...tf(req), _id: req.params.id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addEmployee = async (req, res) => {
  try {
    const { name, password, email, phone, role } = req.body;
    if (!name || !password || !email || !phone || !role) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const existing = await User.findOne({ ...tf(req), $or: [{ name }, { email }, { phone }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Name, email, or phone already exists' });
    }

    const employee = await User.create({ ...tf(req), name, password, email, phone, role });
    res.status(201).json({ success: true, message: 'Employee added successfully', data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const editEmployee = async (req, res) => {
  try {
    const employee = await User.findOne({ ...tf(req), _id: req.params.id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const { name, email, phone, role, status } = req.body;
    if (name)   employee.name   = name;
    if (email)  employee.email  = email;
    if (phone)  employee.phone  = phone;
    if (role)   employee.role   = role;
    if (status) employee.status = status;

    const updated = await employee.save();
    res.status(200).json({ success: true, message: 'Employee updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findOne({ ...tf(req), _id: req.params.id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    employee.status = 'Inactive';
    await employee.save();
    res.status(200).json({ success: true, message: 'Employee disabled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide new password' });
    }

    const employee = await User.findOne({ ...tf(req), _id: req.params.id }).select('+password');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    employee.password = newPassword;
    await employee.save();
    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const changeRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ success: false, message: 'Please provide role' });
    }

    const employee = await User.findOne({ ...tf(req), _id: req.params.id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    employee.role = role;
    const updated = await employee.save();
    res.status(200).json({ success: true, message: 'Employee role updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployeesByRole = async (req, res) => {
  try {
    const employees = await User.find({ ...tf(req), role: req.params.role });
    res.status(200).json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getActiveEmployees = async (req, res) => {
  try {
    const employees = await User.find({ ...tf(req), status: 'Active' });
    res.status(200).json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
