import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pool from "../config/db.js";

dotenv.config();

// Creates token after register/login
const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      accountType: user.account_type,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// Register new farmer or business user
export const register = async (req, res) => {
  try {
    const { name, email, password, accountType } = req.body;

    // Check form fields
    if (!name || !email || !password || !accountType) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    // Only these account types can register publicly
    if (accountType !== "farmer" && accountType !== "business") {
      return res.status(400).json({
        message: "Account type must be farmer or business.",
      });
    }

    // Password must have at least 6 characters
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check email already exists or not
    const [existingUsers] = await pool.execute(
      "SELECT u_id FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }

    // Encrypt password before saving it
    const passwordHash = await bcrypt.hash(password, 12);

    // Save new user in MySQL
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password_hash, account_type)
       VALUES (?, ?, ?, ?)`,
      [
        name.trim(),
        cleanEmail,
        passwordHash,
        accountType,
      ]
    );

    // Create user object for token and frontend
    const user = {
      id: result.insertId,
      name: name.trim(),
      email: cleanEmail,
      account_type: accountType,
    };

    const token = createToken(user);

    // Send token and user data to React
    res.status(201).json({
      message: "Account created successfully.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        accountType: user.account_type,
      },
    });
  } catch (error) {
    console.log("Register error:", error);

    res.status(500).json({
      message: "Could not create account.",
    });
  }
};

// Login existing user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Find user in MySQL
    const [users] = await pool.execute(
      "SELECT u_id AS id, name, email, password_hash, account_type FROM users WHERE email = ?",
      [cleanEmail]
    );

    const user = users[0];

    // Do not reveal whether email or password is wrong
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Compare entered password with encrypted database password
    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = createToken(user);

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        accountType: user.account_type,
      },
    });
  } catch (error) {
    console.log("Login error:", error);

    res.status(500).json({
      message: "Could not log in.",
    });
  }
};