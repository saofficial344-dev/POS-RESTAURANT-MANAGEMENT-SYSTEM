import User, { VALID_ROLES } from "../models/User.js";

// GET /api/users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/users
export const createUser = async (req, res) => {
  try {
    const { name, password, role, email, branch, adminPassword } = req.body;

    if (!name || !password || !role) {
      return res
        .status(400)
        .json({ message: "Name, password and role are required" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Creating another Admin requires the requesting admin to re-verify identity
    if (role === "admin") {
      if (!adminPassword) {
        return res.status(400).json({
          message: "Creating an Admin account requires your current password for verification",
        });
      }
      const requestingAdmin = await User.findById(req.user._id);
      if (!requestingAdmin) {
        return res.status(401).json({ message: "Requesting admin not found" });
      }
      const isValid = await requestingAdmin.matchPassword(adminPassword);
      if (!isValid) {
        return res.status(401).json({
          message: "Admin password verification failed — incorrect password",
        });
      }
    }

    // Username uniqueness
    const nameExists = await User.findOne({ name });
    if (nameExists) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Email uniqueness (only when provided)
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: "Email address already in use" });
      }
    }

    const user = await User.create({ name, password, role, email, branch });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      role: user.role,
      email: user.email,
      branch: user.branch,
      status: user.status,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/users/:id
export const updateUser = async (req, res) => {
  try {
    const { name, email, branch, role, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent admin from downgrading their own role
    if (
      req.user._id.toString() === req.params.id &&
      role &&
      role !== user.role
    ) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }

    if (name && name !== user.name) {
      const taken = await User.findOne({ name });
      if (taken) return res.status(400).json({ message: "Username already taken" });
      user.name = name;
    }

    // Email uniqueness — skip if unchanged
    if (email !== undefined && email !== user.email) {
      if (email) {
        const emailTaken = await User.findOne({ email, _id: { $ne: req.params.id } });
        if (emailTaken) {
          return res.status(400).json({ message: "Email address already in use" });
        }
      }
      user.email = email;
    }
    if (branch !== undefined) user.branch = branch;
    if (role && VALID_ROLES.includes(role)) user.role = role;

    // Set plaintext — the pre-save hook will hash it on save
    if (password) {
      user.password = password;
    }

    const updated = await user.save({ validateModifiedOnly: true });

    res.json({
      _id: updated._id,
      name: updated.name,
      role: updated.role,
      email: updated.email,
      branch: updated.branch,
      status: updated.status,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/users/:id
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.user._id.toString() === req.params.id) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    await user.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/users/:id/status — toggle active / inactive
export const toggleStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.user._id.toString() === req.params.id) {
      return res
        .status(400)
        .json({ message: "Cannot deactivate your own account" });
    }

    user.status = user.status === "active" ? "inactive" : "active";
    await user.save({ validateModifiedOnly: true });

    res.json({ _id: user._id, status: user.status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
