import Employee from '../models/Employee.js';

export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().select('-password');
    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-password');
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
    const { firstName, lastName, username, password, email, phone, role, branch, salary, shiftTiming } = req.body;

    if (!firstName || !lastName || !username || !password || !email || !phone || !role) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const existingEmployee = await Employee.findOne({ $or: [{ username }, { email }, { phone }] });
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: 'Username, email, or phone already exists' });
    }

    const employee = await Employee.create({
      firstName,
      lastName,
      username,
      password,
      email,
      phone,
      role,
      branch: branch || 'Main',
      salary,
      shiftTiming,
    });

    res.status(201).json({ success: true, message: 'Employee added successfully', data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const editEmployee = async (req, res) => {
  try {
    let employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const { firstName, lastName, email, phone, role, branch, salary, shiftTiming, status, notes } = req.body;

    if (firstName) employee.firstName = firstName;
    if (lastName) employee.lastName = lastName;
    if (email) employee.email = email;
    if (phone) employee.phone = phone;
    if (role) employee.role = role;
    if (branch) employee.branch = branch;
    if (salary) employee.salary = salary;
    if (shiftTiming) employee.shiftTiming = shiftTiming;
    if (status) employee.status = status;
    if (notes) employee.notes = notes;

    employee = await employee.save();
    res.status(200).json({ success: true, message: 'Employee updated successfully', data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
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

    let employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    employee.password = newPassword;
    employee = await employee.save();
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

    let employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    employee.role = role;
    employee = await employee.save();
    res.status(200).json({ success: true, message: 'Employee role updated successfully', data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployeesByRole = async (req, res) => {
  try {
    const employees = await Employee.find({ role: req.params.role }).select('-password');
    res.status(200).json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getActiveEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'Active' }).select('-password');
    res.status(200).json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};