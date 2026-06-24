import User from "../models/User.js";
import jwt from "jsonwebtoken";

// 🔑 Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// ✅ REGISTER USER (Admin ya Cashier)
export const registerUser = async (req, res) => {
  try {
    const { name, password, role } = req.body;

    // check required fields
    if (!name || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // check role valid
    if (!["admin", "cashier"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // check user exists
    const userExists = await User.findOne({ name });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // create user
    const user = await User.create({
      name,
      password,
      role,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔓 LOGIN USER
export const loginUser = async (req, res) => {
  try {
    const { name, password } = req.body;

    const user = await User.findOne({ name });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};