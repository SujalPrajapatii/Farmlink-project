import pool from "../config/db.js";

// Returns true only for valid numbers greater than zero.
// Valid: 1, 10, 25.5
// Invalid: 0, -2, "hello", empty value
const isPositiveNumber = (value) =>
  Number.isFinite(Number(value)) && Number(value) > 0;

// Returns true for zero or positive numbers.
// This is useful during editing because quantity 0 means "out of stock".
const isNonNegativeNumber = (value) =>
  Number.isFinite(Number(value)) && Number(value) >= 0;

// Checks that a value is a non-empty text string.
const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

// Farmer adds a new product.
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      quantity,
      unit,
      price,
      location,
      image,
      tier1MinQty = 51,
      tier1DiscountPct = 10,
      tier2MinQty = 201,
      tier2DiscountPct = 20,
    } = req.body;

    // Check all required text fields.
    if (
      !isNonEmptyString(name) ||
      !isNonEmptyString(category) ||
      !isNonEmptyString(unit) ||
      !isNonEmptyString(location)
    ) {
      return res.status(400).json({
        message: "Product name, category, unit, and location are required.",
      });
    }

    // Check quantity.
    if (!isPositiveNumber(quantity)) {
      return res.status(400).json({
        message: "Quantity must be a positive number.",
      });
    }

    // Check price.
    if (!isPositiveNumber(price)) {
      return res.status(400).json({
        message: "Price must be a positive number.",
      });
    }

    // This comes from the JWT token, not from the frontend.
    // Therefore, a farmer cannot create a product for another farmer.
    const farmerId = req.user.id;

    const [result] = await pool.execute(
      `INSERT INTO products
      (farmer_id, name, category, quantity, unit, price, location, image_url, tier1_min_qty, tier1_discount_pct, tier2_min_qty, tier2_discount_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmerId,
        name.trim(),
        category.trim(),
        Number(quantity),
        unit.trim(),
        Number(price),
        location.trim(),
        isNonEmptyString(image) ? image.trim() : null,
        Number(tier1MinQty) || 51,
        Number(tier1DiscountPct) || 10,
        Number(tier2MinQty) || 201,
        Number(tier2DiscountPct) || 20,
      ]
    );

    return res.status(201).json({
      message: "Product added successfully.",
      productId: result.insertId,
    });
  } catch (error) {
    console.error("Create product error:", error);

    return res.status(500).json({
      message: "Could not add product.",
    });
  }
};

// Business buyers see available products.
export const getAllProducts = async (req, res) => {
  try {
    const [products] = await pool.execute(`
      SELECT
        p.id,
        p.name,
        p.category,
        p.quantity,
        p.unit,
        p.price,
        p.location,
        p.image_url AS image,
        COALESCE(p.tier1_min_qty, 51) AS tier1MinQty,
        COALESCE(p.tier1_discount_pct, 10) AS tier1DiscountPct,
        COALESCE(p.tier2_min_qty, 201) AS tier2MinQty,
        COALESCE(p.tier2_discount_pct, 20) AS tier2DiscountPct,
        p.created_at AS createdAt,
        u.name AS ownerName
      FROM products p
      JOIN users u ON p.farmer_id = u.id
      WHERE p.quantity > 0
      ORDER BY p.created_at DESC
    `);

    return res.json(products);
  } catch (error) {
    console.error("Get all products error:", error);

    return res.status(500).json({
      message: "Could not get products.",
    });
  }
};

// Farmer sees only products they own.
export const getMyProducts = async (req, res) => {
  try {
    const farmerId = req.user.id;

    const [products] = await pool.execute(
      `SELECT
        id,
        name,
        category,
        quantity,
        unit,
        price,
        location,
        image_url AS image,
        COALESCE(tier1_min_qty, 51) AS tier1MinQty,
        COALESCE(tier1_discount_pct, 10) AS tier1DiscountPct,
        COALESCE(tier2_min_qty, 201) AS tier2MinQty,
        COALESCE(tier2_discount_pct, 20) AS tier2DiscountPct,
        created_at AS createdAt
      FROM products
      WHERE farmer_id = ?
      ORDER BY created_at DESC`,
      [farmerId]
    );

    return res.json(products);
  } catch (error) {
    console.error("Get my products error:", error);

    return res.status(500).json({
      message: "Could not get your products.",
    });
  }
};

// Farmer updates one of their own products.
export const updateProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const {
      name,
      category,
      quantity,
      unit,
      price,
      location,
      image,
      tier1MinQty = 51,
      tier1DiscountPct = 10,
      tier2MinQty = 201,
      tier2DiscountPct = 20,
    } = req.body;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    if (
      !isNonEmptyString(name) ||
      !isNonEmptyString(category) ||
      !isNonEmptyString(unit) ||
      !isNonEmptyString(location)
    ) {
      return res.status(400).json({
        message: "Product name, category, unit, and location are required.",
      });
    }

    // Zero is allowed while editing.
    if (!isNonNegativeNumber(quantity)) {
      return res.status(400).json({
        message: "Quantity must be zero or a positive number.",
      });
    }

    if (!isPositiveNumber(price)) {
      return res.status(400).json({
        message: "Price must be a positive number.",
      });
    }

    const farmerId = req.user.id;

    const [result] = await pool.execute(
      `UPDATE products
      SET
        name = ?,
        category = ?,
        quantity = ?,
        unit = ?,
        price = ?,
        location = ?,
        image_url = ?,
        tier1_min_qty = ?,
        tier1_discount_pct = ?,
        tier2_min_qty = ?,
        tier2_discount_pct = ?
      WHERE id = ? AND farmer_id = ?`,
      [
        name.trim(),
        category.trim(),
        Number(quantity),
        unit.trim(),
        Number(price),
        location.trim(),
        isNonEmptyString(image) ? image.trim() : null,
        Number(tier1MinQty) || 51,
        Number(tier1DiscountPct) || 10,
        Number(tier2MinQty) || 201,
        Number(tier2DiscountPct) || 20,
        productId,
        farmerId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Product not found or you cannot edit it.",
      });
    }

    return res.json({
      message: "Product updated successfully.",
    });
  } catch (error) {
    console.error("Update product error:", error);

    return res.status(500).json({
      message: "Could not update product.",
    });
  }
};

// Farmer deletes one of their own products.
export const deleteProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const farmerId = req.user.id;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const [result] = await pool.execute(
      "DELETE FROM products WHERE id = ? AND farmer_id = ?",
      [productId, farmerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Product not found or you cannot delete it.",
      });
    }

    return res.status(200).json({
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return res.status(500).json({
      message: "Could not delete product.",
    });
  }
};