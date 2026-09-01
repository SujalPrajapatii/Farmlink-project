import bcrypt from "bcryptjs";
import pool from "./config/db.js";

async function seed() {
  const password = "Password123!";
  const hash = await bcrypt.hash(password, 12);

  const users = [
    {
      name: "Ramesh Patel (Organic Farmer)",
      email: "ramesh.patel@farmlink.com",
      role: "farmer",
      phone: "9876543210",
      vehicleType: null,
      vehicleNumber: null,
    },
    {
      name: "Pooja Mehta (Business Buyer)",
      email: "pooja.mehta@farmlink.com",
      role: "business",
      phone: "9123456780",
      vehicleType: null,
      vehicleNumber: null,
    },
    {
      name: "Vikram Delivery Hero",
      email: "vikram.rider@farmlink.com",
      role: "delivery",
      phone: "9988776655",
      vehicleType: "Electric Scooter",
      vehicleNumber: "GJ-01-FL-9988",
    },
  ];

  for (const u of users) {
    await pool.execute(
      `INSERT INTO users (name, email, password_hash, account_type, phone, vehicle_type, vehicle_number, availability_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password_hash = VALUES(password_hash),
         account_type = VALUES(account_type),
         phone = VALUES(phone),
         vehicle_type = VALUES(vehicle_type),
         vehicle_number = VALUES(vehicle_number),
         availability_status = 'AVAILABLE'`,
      [u.name, u.email, hash, u.role, u.phone, u.vehicleType, u.vehicleNumber]
    );
    console.log(`✓ Account ready: ${u.name} | Email: ${u.email} | Role: ${u.role}`);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
