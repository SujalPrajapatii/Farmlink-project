import express from "express";
import pool from "../config/db.js"; // Change this path if needed

const router = express.Router();

router.get("/users/:id/trust-score", async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.query(
      `SELECT id, name, trust_score, is_verified
       FROM users
       WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = users[0];

    let badge = "New Farmer";
    if (user.trust_score >= 80) {
      badge = "Trusted Farmer";
    } else if (user.trust_score >= 60) {
      badge = "Reliable Farmer";
    }

    res.json({
      success: true,
      user,
      badge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get("/price-advisor", async (req, res) => {
    try {
      const { crop, location } = req.query;
  
      if (!crop || !location) {
        return res.status(400).json({
          success: false,
          message: "crop and location are required"
        });
      }
  
      const [prices] = await pool.query(
        `SELECT market_name, price_per_kg, recorded_at
         FROM market_prices
         WHERE crop_name = ? AND location = ?
         ORDER BY price_per_kg DESC`,
        [crop, location]
      );
  
      if (prices.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No price data found"
        });
      }
  
      const total = prices.reduce(
        (sum, price) => sum + Number(price.price_per_kg),
        0
      );
  
      const averagePrice = total / prices.length;
      const bestPrice = prices[0];
  
      res.json({
        success: true,
        crop,
        location,
        best_market: bestPrice.market_name,
        best_price_per_kg: bestPrice.price_per_kg,
        average_price_per_kg: averagePrice.toFixed(2),
        suggestion: `Best option: sell at ${bestPrice.market_name}.`,
        market_prices: prices
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

export default router;