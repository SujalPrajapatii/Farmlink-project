import pool from "../config/db.js";

// 1. Farmer adds a new product
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
    } = req.body;

    // Check that required product fields were sent
    if (!name || !category || !quantity || !unit || !price || !location) {
      return res.status(400).json({
        message: "Please fill all required product fields.",
      });
    }

    // Quantity must be greater than zero
    if (Number(quantity) <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than zero.",
      });
    }

    // Price must be greater than zero
    if (Number(price) <= 0) {
      return res.status(400).json({
        message: "Price must be greater than zero.",
      });
    }

    // req.user.id comes from authMiddleware.
    // It is the ID of the farmer who is currently logged in.
    const farmerId = req.user.id;

    const [result] = await pool.execute(
      `INSERT INTO products
      (farmer_id, name, category, quantity, unit, price, location, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmerId,
        name.trim(),
        category,
        quantity,
        unit,
        price,
        location.trim(),
        image || null,
      ]
    );

    res.status(201).json({
      message: "Product added successfully.",
      productId: result.insertId,
    });
  } catch (error) {
    console.error("Create product error:", error);

    res.status(500).json({
      message: "Could not add product.",
    });
  }
};

// 2. Business sees all products that are still available
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
        p.created_at AS createdAt,
        u.name AS ownerName,
        u.email AS ownerEmail
      FROM products p
      JOIN users u ON p.farmer_id = u.id
      WHERE p.quantity > 0
      ORDER BY p.created_at DESC
    `);

    res.json(products);
  } catch (error) {
    console.error("Get all products error:", error);

    res.status(500).json({
      message: "Could not get products.",
    });
  }
};

// 3. Farmer sees only their own products
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
        created_at AS createdAt
      FROM products
      WHERE farmer_id = ?
      ORDER BY created_at DESC`,
      [farmerId]
    );

    res.json(products);
  } catch (error) {
    console.error("Get my products error:", error);

    res.status(500).json({
      message: "Could not get your products.",
    });
  }
};

// 4. Farmer edits one of their own products
export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const {
      name,
      category,
      quantity,
      unit,
      price,
      location,
      image,
    } = req.body;

    if (!name || !category || !quantity || !unit || !price || !location) {
      return res.status(400).json({
        message: "Please fill all required product fields.",
      });
    }

    if (Number(quantity) < 0) {
      return res.status(400).json({
        message: "Quantity cannot be negative.",
      });
    }

    if (Number(price) <= 0) {
      return res.status(400).json({
        message: "Price must be greater than zero.",
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
        image_url = ?
      WHERE id = ? AND farmer_id = ?`,
      [
        name.trim(),
        category,
        quantity,
        unit,
        price,
        location.trim(),
        image || null,
        productId,
        farmerId,
      ]
    );

    // affectedRows = 0 means:
    // product does not exist OR product belongs to another farmer
    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Product not found or you cannot edit it.",
      });
    }

    res.json({
      message: "Product updated successfully.",
    });
  } catch (error) {
    console.error("Update product error:", error);

    res.status(500).json({
      message: "Could not update product.",
    });
  }
};

// 5. Farmer deletes one of their own products
export const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const farmerId = req.user.id;

    const [result] = await pool.execute(
      "DELETE FROM products WHERE id = ? AND farmer_id = ?",
      [productId, farmerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Product not found or you cannot delete it.",
      });
    }

    res.status(200).json({
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    res.status(500).json({
      message: "Could not delete product.",
    });
  }
};