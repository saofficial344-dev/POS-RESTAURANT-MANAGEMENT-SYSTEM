import User, { VALID_ROLES } from "../models/User.js";
import jwt from "jsonwebtoken";

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// POST /api/auth/register — admin-only: creates a new staff account
export const registerUser = async (req, res) => {
  try {
    const { name, password, role, email, branch } = req.body;

    if (!name || !password || !role) {
      return res
        .status(400)
        .json({ message: "Name, password and role are required" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const userExists = await User.findOne({ name });
    if (userExists) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const user = await User.create({ name, password, role, email, branch });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      role: user.role,
      email: user.email,
      branch: user.branch,
      status: user.status,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login — all roles, single endpoint
export const loginUser = async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ name });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.status === "inactive") {
      return res.status(403).json({
        message: "Account is inactive. Contact your administrator.",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      role: user.role,
      email: user.email,
      branch: user.branch,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};