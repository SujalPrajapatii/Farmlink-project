import crypto from "crypto";
import Razorpay from "razorpay";
import pool from "../config/db.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Buyer requests a Razorpay payment order for their FarmLink order.
export const createOnlinePayment = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        message: "Online payments are not configured. Add Razorpay test keys to backend/.env.",
      });
    }

    const orderId = Number(req.params.id);
    const businessId = req.user.id;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const [orders] = await pool.execute(
      `SELECT
        o_id AS id,
        total,
        status,
        payment_method,
        payment_status,
        gateway_order_id
      FROM orders
      WHERE o_id = ? AND business_id = ?`,
      [orderId, businessId]
    );

    const order = orders[0];

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    if (order.payment_method !== "ONLINE") {
      return res.status(400).json({
        message: "This order does not use online payment.",
      });
    }

    if (order.payment_status === "PAID") {
      return res.status(400).json({
        message: "This order has already been paid.",
      });
    }

    if (order.status !== "Awaiting Payment") {
      return res.status(400).json({
        message: "This order is not waiting for payment.",
      });
    }

    // Razorpay amount is in paise.
    // ₹250.50 becomes 25050 paise.
    const amountInPaise = Math.round(Number(order.total) * 100);

    if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
      return res.status(400).json({
        message: "Invalid order amount.",
      });
    }

    let razorpayOrderId = order.gateway_order_id;

    // Do not create multiple Razorpay orders when buyer retries payment.
    if (!razorpayOrderId) {
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `farmlink_order_${order.id}`,
      });

      razorpayOrderId = razorpayOrder.id;

      await pool.execute(
        `UPDATE orders
         SET gateway_order_id = ?
         WHERE o_id = ?`,
        [razorpayOrderId, order.id]
      );

      await pool.execute(
        `UPDATE payments
         SET gateway_order_id = ?
         WHERE order_id = ?`,
        [razorpayOrderId, order.id]
      );
    }

    // RAZORPAY_KEY_ID is public and safe for frontend Checkout.
    // RAZORPAY_KEY_SECRET stays on backend only.
    return res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId,
      amount: amountInPaise,
      currency: "INR",
      internalOrderId: order.id,
    });
  } catch (error) {
    console.error("Create Razorpay payment error:", error);

    return res.status(500).json({
      message: "Could not create online payment.",
    });
  }
};

// Frontend sends Razorpay's success response to this endpoint.
// Backend verifies the signature before marking the order paid.
export const verifyOnlinePayment = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const orderId = Number(req.params.id);
    const businessId = req.user.id;

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = req.body;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    if (
      !razorpay_payment_id ||
      !razorpay_order_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        message: "Incomplete payment information.",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // Lock the order so duplicate requests cannot mark it paid twice.
    const [orders] = await connection.execute(
      `SELECT
        o_id AS id,
        status,
        payment_method,
        payment_status,
        gateway_order_id
      FROM orders
      WHERE o_id = ? AND business_id = ?
      FOR UPDATE`,
      [orderId, businessId]
    );

    const order = orders[0];

    if (!order) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Order not found.",
      });
    }

    if (order.payment_method !== "ONLINE") {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "This order does not use online payment.",
      });
    }

    if (order.payment_status === "PAID") {
      await connection.rollback();
      transactionStarted = false;

      return res.json({
        message: "Payment was already verified.",
      });
    }

    // Prevent a payment response from another Razorpay order being used here.
    if (order.gateway_order_id !== razorpay_order_id) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Payment order does not match this FarmLink order.",
      });
    }

    // Razorpay signature formula:
    // HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id)
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${order.gateway_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const receivedSignature = String(razorpay_signature);

    const signaturesMatch =
      receivedSignature.length === expectedSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignature)
      );

    if (!signaturesMatch) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Payment signature verification failed.",
      });
    }

    // Payment is genuine. Stock was reserved when the order was created,
    // so the paid order is accepted automatically and ready for delivery.
    await connection.execute(
      `UPDATE orders
       SET
         payment_status = 'PAID',
         gateway_payment_id = ?,
         status = 'Accepted'
       WHERE o_id = ?`,
      [razorpay_payment_id, order.id]
    );

    await connection.execute(
      `UPDATE payments
       SET
         payment_status = 'PAID',
         gateway_payment_id = ?
       WHERE order_id = ?`,
      [razorpay_payment_id, order.id]
    );

    await connection.execute(
      `UPDATE order_items
       SET status = 'Accepted'
       WHERE order_id = ? AND status = 'Awaiting Payment'`,
      [order.id]
    );

    await connection.execute(
      `INSERT INTO order_tracking_events (order_id, status, note)
       VALUES (?, ?, ?)`,
      [
        order.id,
        "Accepted",
        "Online payment verified. Order accepted automatically and ready for delivery.",
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return res.json({
      message: "Payment verified successfully.",
    });
  } catch (error) {
    console.error("Verify Razorpay payment error:", error);

    if (connection && transactionStarted) {
      await connection.rollback();
    }

    return res.status(500).json({
      message: "Could not verify payment.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Razorpay calls this endpoint directly.
// It is a backup confirmation path if buyer closes the browser after paying.
export const paymentWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers["x-razorpay-signature"];
    const rawBody = req.body;

    if (!webhookSignature || !Buffer.isBuffer(rawBody)) {
      return res.status(400).send("Invalid webhook request");
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    const receivedSignature = String(webhookSignature);

    const signatureIsValid =
      receivedSignature.length === expectedSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignature)
      );

    if (!signatureIsValid) {
      return res.status(400).send("Invalid webhook signature");
    }

    const eventData = JSON.parse(rawBody.toString("utf8"));

    // For successful captured Razorpay payments.
    if (eventData.event === "payment.captured") {
      const payment = eventData.payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      const razorpayPaymentId = payment.id;

      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        // Only update an unpaid online order.
        const [result] = await connection.execute(
          `UPDATE orders
           SET
             payment_status = 'PAID',
             gateway_payment_id = ?,
             status = 'Accepted'
           WHERE gateway_order_id = ?
             AND payment_method = 'ONLINE'
             AND payment_status <> 'PAID'`,
          [razorpayPaymentId, razorpayOrderId]
        );

        await connection.execute(
          `UPDATE payments
           SET
             payment_status = 'PAID',
             gateway_payment_id = ?
           WHERE gateway_order_id = ?
             AND payment_method = 'ONLINE'
             AND payment_status <> 'PAID'`,
          [razorpayPaymentId, razorpayOrderId]
        );

        // Add only one tracking event if webhook changed an order.
        if (result.affectedRows > 0) {
          const [orders] = await connection.execute(
            "SELECT o_id AS id FROM orders WHERE gateway_order_id = ?",
            [razorpayOrderId]
          );

          const order = orders[0];

          if (order) {
            await connection.execute(
              `UPDATE order_items
               SET status = 'Accepted'
               WHERE order_id = ? AND status = 'Awaiting Payment'`,
              [order.id]
            );

            await connection.execute(
              `INSERT INTO order_tracking_events (order_id, status, note)
               VALUES (?, ?, ?)`,
              [
                order.id,
                "Accepted",
                "Online payment confirmed. Order accepted automatically and ready for delivery.",
              ]
            );
          }
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    // Razorpay must receive a quick successful response.
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);

    return res.status(500).json({
      message: "Webhook processing failed.",
    });
  }
};
