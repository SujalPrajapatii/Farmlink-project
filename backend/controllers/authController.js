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

// Register new farmer, business, or delivery user
export const register = async (req, res) => {
  try {
    const { name, email, password, accountType, phone, vehicleType, vehicleNumber } = req.body;

    // Check form fields
    if (!name || !email || !password || !accountType) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    const normalizedRole =
      accountType === "delivery_boy" || accountType === "delivery"
        ? "delivery"
        : accountType;

    // Only these account types can register publicly
    if (normalizedRole !== "farmer" && normalizedRole !== "business" && normalizedRole !== "delivery") {
      return res.status(400).json({
        message: "Account type must be farmer, business, or delivery.",
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

    const cleanPhone = typeof phone === "string" ? phone.trim() : null;
    const cleanVehicleType = typeof vehicleType === "string" ? vehicleType.trim() : "Bike";
    const cleanVehicleNumber = typeof vehicleNumber === "string" ? vehicleNumber.trim().toUpperCase() : null;

    // Save new user in MySQL
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password_hash, account_type, phone, vehicle_type, vehicle_number, availability_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
      [
        name.trim(),
        cleanEmail,
        passwordHash,
        normalizedRole,
        cleanPhone,
        cleanVehicleType,
        cleanVehicleNumber,
      ]
    );

    // Create user object for token and frontend
    const user = {
      id: result.insertId,
      name: name.trim(),
      email: cleanEmail,
      account_type: normalizedRole,
      phone: cleanPhone,
      vehicle_type: cleanVehicleType,
      vehicle_number: cleanVehicleNumber,
      availability_status: "AVAILABLE",
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
        phone: user.phone,
        vehicleType: user.vehicle_type,
        vehicleNumber: user.vehicle_number,
        availabilityStatus: user.availability_status,
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
      `SELECT u_id AS id, name, email, password_hash, account_type,
              phone, vehicle_type AS vehicleType, vehicle_number AS vehicleNumber,
              availability_status AS availabilityStatus,
              current_latitude AS currentLatitude, current_longitude AS currentLongitude
       FROM users WHERE email = ?`,
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

    const token = createToken({
      id: user.id,
      account_type: user.account_type,
    });

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        accountType: user.account_type,
        phone: user.phone || "",
        vehicleType: user.vehicleType || "Bike",
        vehicleNumber: user.vehicleNumber || "",
        availabilityStatus: user.availabilityStatus || "AVAILABLE",
        currentLatitude: user.currentLatitude || null,
        currentLongitude: user.currentLongitude || null,
      },
    });
  } catch (error) {
    console.log("Login error:", error);

    res.status(500).json({
      message: "Could not log in.",
    });
  }
};

// Get current logged in user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await pool.execute(
      `SELECT u_id AS id, name, email, account_type AS accountType,
              phone, vehicle_type AS vehicleType, vehicle_number AS vehicleNumber,
              availability_status AS availabilityStatus,
              current_latitude AS currentLatitude, current_longitude AS currentLongitude,
              created_at AS createdAt
       FROM users WHERE u_id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(users[0]);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Could not load profile." });
  }
};

// Update user profile (phone, vehicle, name)
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, vehicleType, vehicleNumber, availabilityStatus } = req.body;

    const updates = [];
    const params = [];

    if (typeof name === "string" && name.trim()) {
      updates.push("name = ?");
      params.push(name.trim());
    }
    if (typeof phone === "string") {
      updates.push("phone = ?");
      params.push(phone.trim());
    }
    if (typeof vehicleType === "string") {
      updates.push("vehicle_type = ?");
      params.push(vehicleType.trim());
    }
    if (typeof vehicleNumber === "string") {
      updates.push("vehicle_number = ?");
      params.push(vehicleNumber.trim().toUpperCase());
    }
    if (["AVAILABLE", "BUSY", "OFFLINE"].includes(availabilityStatus)) {
      updates.push("availability_status = ?");
      params.push(availabilityStatus);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No valid profile fields provided." });
    }

    params.push(userId);
    await pool.execute(
      `UPDATE users SET ${updates.join(", ")} WHERE u_id = ?`,
      params
    );

    const [users] = await pool.execute(
      `SELECT u_id AS id, name, email, account_type AS accountType,
              phone, vehicle_type AS vehicleType, vehicle_number AS vehicleNumber,
              availability_status AS availabilityStatus
       FROM users WHERE u_id = ?`,
      [userId]
    );

    res.json({
      message: "Profile updated successfully.",
      user: users[0],
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Could not update profile." });
  }
};