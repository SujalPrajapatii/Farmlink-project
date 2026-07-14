import pool from "../config/db.js";

const isText = (value) =>
  typeof value === "string" && value.trim().length > 0;

export const createAddress = async (req, res) => {
  try {
    const {
      recipientName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      isDefault,
    } = req.body;

    if (
      !isText(recipientName) ||
      !isText(phone) ||
      !isText(addressLine1) ||
      !isText(city) ||
      !isText(state) ||
      !/^\d{6}$/.test(String(pincode))
    ) {
      return res.status(400).json({
        message:
          "Recipient name, phone, address, city, state, and valid 6-digit pincode are required.",
      });
    }

    const businessId = req.user.id;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // If the new address is marked as default,
      // remove default status from the user's older addresses.
      if (isDefault) {
        await connection.execute(
          "UPDATE delivery_addresses SET is_default = FALSE WHERE business_id = ?",
          [businessId]
        );
      }

      const [result] = await connection.execute(
        `INSERT INTO delivery_addresses
        (
          business_id,
          recipient_name,
          phone,
          address_line1,
          address_line2,
          city,
          state,
          pincode,
          is_default
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          businessId,
          recipientName.trim(),
          phone.trim(),
          addressLine1.trim(),
          isText(addressLine2) ? addressLine2.trim() : null,
          city.trim(),
          state.trim(),
          String(pincode),
          Boolean(isDefault),
        ]
      );

      await connection.commit();

      return res.status(201).json({
        message: "Delivery address saved successfully.",
        addressId: result.insertId,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Create address error:", error);

    return res.status(500).json({
      message: "Could not save delivery address.",
    });
  }
};

export const getMyAddresses = async (req, res) => {
  try {
    const businessId = req.user.id;

    const [addresses] = await pool.execute(
      `SELECT
        id,
        recipient_name AS recipientName,
        phone,
        address_line1 AS addressLine1,
        address_line2 AS addressLine2,
        city,
        state,
        pincode,
        is_default AS isDefault
      FROM delivery_addresses
      WHERE business_id = ?
      ORDER BY is_default DESC, created_at DESC`,
      [businessId]
    );

    return res.json(addresses);
  } catch (error) {
    console.error("Get addresses error:", error);

    return res.status(500).json({
      message: "Could not get delivery addresses.",
    });
  }
};