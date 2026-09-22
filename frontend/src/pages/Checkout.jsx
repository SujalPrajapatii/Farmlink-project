import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { getTierPricing } from "../pricing";

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Buy now provides one item; Cart provides many items in one checkout.
  const product = location.state?.product;
  const [cartItems, setCartItems] = useState(() =>
    location.state?.cart?.length
      ? location.state.cart
      : product
      ? [{ product, quantity: Number(location.state?.quantity || 1) }]
      : JSON.parse(localStorage.getItem("farmlinkCart") || "[]")
  );

  useEffect(() => {
    localStorage.setItem("farmlinkCart", JSON.stringify(cartItems));
  }, [cartItems]);

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const accountType = currentUser?.accountType;

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [addressForm, setAddressForm] = useState({
    recipientName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "Gujarat",
    pincode: "",
    isDefault: false,
  });

  // Load saved addresses when any authenticated buyer/farmer/admin opens Checkout.
  useEffect(() => {
    if (!currentUser) return;

    async function loadAddresses() {
      try {
        const data = await api("/addresses");
        setAddresses(data);

        // Automatically select default address.
        const defaultAddress = data.find((address) => address.isDefault);

        if (defaultAddress) {
          setSelectedAddressId(String(defaultAddress.id));
        } else if (data.length > 0) {
          setSelectedAddressId(String(data[0].id));
        }
      } catch (error) {
        alert(error.message);
      }
    }

    loadAddresses();
  }, [currentUser?.id]);

  // This page requires login.
  if (!currentUser) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Login required</h1>
          <p>Please log in to continue with your checkout.</p>

          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>No product selected</h1>
          <p>Please select a product from the marketplace first.</p>

          <Link className="farmer-btn" to="/business-dashboard">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const totalOriginal = cartItems.reduce(
    (total, item) => total + getTierPricing(item.product, item.quantity).originalTotal,
    0
  );
  const totalSavings = cartItems.reduce(
    (total, item) => total + getTierPricing(item.product, item.quantity).savings,
    0
  );
  const orderTotal = cartItems.reduce(
    (total, item) => total + getTierPricing(item.product, item.quantity).total,
    0
  );

  function changeCartQuantity(productId, nextQuantity) {
    setCartItems((items) =>
      items.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: nextQuantity }
          : item
      )
    );
  }

  function removeCartItem(productId) {
    setCartItems((items) =>
      items.filter((item) => item.product.id !== productId)
    );
  }

  function handleAddressChange(event) {
    const { name, value, type, checked } = event.target;

    setAddressForm({
      ...addressForm,
      [name]: type === "checkbox" ? checked : value,
    });
  }

  async function saveAddress(event) {
    event.preventDefault();

    try {
      setSavingAddress(true);

      const result = await api("/addresses", {
        method: "POST",
        body: JSON.stringify(addressForm),
      });

      const updatedAddresses = await api("/addresses");

      setAddresses(updatedAddresses);
      setSelectedAddressId(String(result.addressId));
      setShowAddressForm(false);

      setAddressForm({
        recipientName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "Gujarat",
        pincode: "",
        isDefault: false,
      });

      alert("Delivery address saved successfully.");
    } catch (error) {
      alert(error.message);
    } finally {
      setSavingAddress(false);
    }
  }

  async function payOnline(orderId) {
    const paymentData = await api(`/payments/orders/${orderId}/create`, {
      method: "POST",
    });

    if (!window.Razorpay) {
      throw new Error(
        "Payment service did not load. Refresh the page and try again."
      );
    }

    const paymentResult = await new Promise((resolve, reject) => {
      const razorpayCheckout = new window.Razorpay({
        key: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        name: "FarmLink",
        description: `Payment for order #${orderId}`,
        order_id: paymentData.razorpayOrderId,

        prefill: {
          name: currentUser.name,
          email: currentUser.email,
        },

        theme: {
          color: "#2f7d32",
        },

        handler: (response) => {
          resolve(response);
        },

        modal: {
          ondismiss: () => {
            reject(new Error("Payment was cancelled."));
          },
        },
      });

      razorpayCheckout.open();
    });

    await api(`/payments/orders/${orderId}/verify`, {
      method: "POST",
      body: JSON.stringify(paymentResult),
    });
  }

  async function placeOrder(event) {
    event.preventDefault();

    if (!selectedAddressId) {
      alert("Please add and select a delivery address.");
      return;
    }

    if (
      cartItems.some(
        (item) =>
          !Number.isInteger(Number(item.quantity)) ||
          Number(item.quantity) < 1 ||
          Number(item.quantity) > Number(item.product.quantity)
      )
    ) {
      alert("One or more cart quantities are not available.");
      return;
    }

    try {
      setPlacingOrder(true);

      const orderResult = await api("/orders/cart", {
        method: "POST",
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: Number(item.quantity),
          })),
          addressId: Number(selectedAddressId),
          paymentMethod,
        }),
      });

      if (paymentMethod === "COD") {
        alert(
          "Order placed and accepted automatically. The farmer will arrange delivery."
        );

        localStorage.removeItem("farmlinkCart");
        navigate(currentUser?.accountType === "farmer" ? "/farmer-orders" : "/buyer-orders");
        return;
      }

      const mainOrderId = orderResult.orderId || (orderResult.orders && orderResult.orders[0]?.orderId);
      await payOnline(mainOrderId);

      alert(
        "Online payment successful. Your order has been accepted and is ready for delivery."
      );

      localStorage.removeItem("farmlinkCart");
      navigate(currentUser?.accountType === "farmer" ? "/farmer-orders" : "/buyer-orders");
    } catch (error) {
      alert(error.message);
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "780px" }}>
        <Link className="back-link" to="/business-dashboard">
          ← Back to Marketplace
        </Link>

        <h1>Checkout</h1>
        <p>Review your order, wholesale discounts, delivery address, and payment method.</p>

        <section className="checkout-summary" style={{ margin: "20px 0" }}>
          <h2 style={{ marginBottom: "12px" }}>Cart Items</h2>
          {cartItems.map((item) => {
            const pricing = getTierPricing(item.product, item.quantity);
            return (
              <div
                className="cart-checkout-item"
                key={item.product.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  padding: "14px 16px",
                  background: "#fdfdfd",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  marginBottom: "10px",
                }}
              >
                <div style={{ flex: "1 1 auto" }}>
                  <strong style={{ fontSize: "16px", color: "#164e2f" }}>
                    {item.product.name}
                  </strong>
                  <p style={{ margin: "2px 0 4px", fontSize: "13px", color: "#64748b" }}>
                    {item.product.category}
                  </p>
                  <p style={{ margin: 0, fontSize: "13px" }}>
                    {pricing.isDiscounted ? (
                      <>
                        <span style={{ color: "#15803d", fontWeight: 700 }}>
                          ₹{pricing.discountedUnitPrice.toFixed(2)} / {pricing.unit}
                        </span>{" "}
                        <span
                          style={{
                            textDecoration: "line-through",
                            color: "#94a3b8",
                            fontSize: "12px",
                            marginLeft: "4px",
                          }}
                        >
                          ₹{Number(item.product.price).toFixed(2)}
                        </span>{" "}
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#166534",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 700,
                            marginLeft: "4px",
                          }}
                        >
                          🏷️ {pricing.tierBadge}
                        </span>
                      </>
                    ) : (
                      <span>₹{Number(item.product.price).toFixed(2)} / {pricing.unit}</span>
                    )}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#334155" }}>
                    Item Total: <strong>₹{pricing.total.toFixed(2)}</strong>
                    {pricing.isDiscounted && (
                      <span style={{ color: "#16a34a", fontWeight: 600, marginLeft: "6px" }}>
                        (Saved ₹{pricing.savings.toFixed(2)})
                      </span>
                    )}
                  </p>
                </div>

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    fontSize: "12px",
                    color: "#475569",
                  }}
                >
                  Quantity ({pricing.unit})
                  <input
                    type="number"
                    min="1"
                    max={item.product.quantity}
                    value={item.quantity}
                    onChange={(event) =>
                      changeCartQuantity(item.product.id, event.target.value)
                    }
                    style={{ width: "80px", padding: "6px 8px", borderRadius: "6px" }}
                  />
                </label>

                <button
                  className="cancel-btn"
                  type="button"
                  onClick={() => removeCartItem(item.product.id)}
                  style={{ padding: "6px 12px" }}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </section>

        <form onSubmit={placeOrder}>
          <div
            style={{
              background: totalSavings > 0 ? "#f0fdf4" : "#f8fafc",
              border: totalSavings > 0 ? "1px solid #86efac" : "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "16px 20px",
              margin: "16px 0 24px",
            }}
          >
            {totalSavings > 0 ? (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                    fontSize: "14px",
                    color: "#64748b",
                  }}
                >
                  <span>
                    Subtotal ({cartItems.reduce((acc, it) => acc + Number(it.quantity || 1), 0)}{" "}
                    units):
                  </span>
                  <span style={{ textDecoration: "line-through" }}>
                    ₹{totalOriginal.toFixed(2)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#16a34a",
                    fontWeight: 700,
                  }}
                >
                  <span>🎉 Wholesale Bulk Savings:</span>
                  <span>- ₹{totalSavings.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "10px",
                    borderTop: "1px dashed #bbf7d0",
                    fontSize: "20px",
                    fontWeight: 800,
                    color: "#14532d",
                  }}
                >
                  <span>Total Payable:</span>
                  <span>₹{orderTotal.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#1e293b",
                  }}
                >
                  <span>Total Amount:</span>
                  <span>₹{orderTotal.toFixed(2)}</span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#64748b" }}>
                  💡 Tip: Bulk orders of 51+ units receive 10% wholesale discount, and 201+ units receive 20% discount!
                </p>
              </div>
            )}
          </div>

          <hr />

          <div className="section-heading">
            <h2>Delivery Address</h2>

            <button
              className="login-btn"
              type="button"
              onClick={() => setShowAddressForm(!showAddressForm)}
            >
              {showAddressForm ? "Close Address Form" : "+ Add New Address"}
            </button>
          </div>

          {addresses.length === 0 && !showAddressForm && (
            <p className="muted-text">
              No address found. Add a delivery address before placing an order.
            </p>
          )}

          {addresses.length > 0 && (
            <div className="address-list">
              {addresses.map((address) => (
                <label className="address-card" key={address.id}>
                  <input
                    type="radio"
                    name="selectedAddress"
                    value={address.id}
                    checked={String(address.id) === selectedAddressId}
                    onChange={(event) =>
                      setSelectedAddressId(event.target.value)
                    }
                  />

                  <span>
                    <strong>{address.recipientName}</strong>
                    {address.isDefault && <span> (Default)</span>}
                    <br />
                    {address.phone}
                    <br />
                    {address.addressLine1}
                    {address.addressLine2 && (
                      <>
                        <br />
                        {address.addressLine2}
                      </>
                    )}
                    <br />
                    {address.city}, {address.state} - {address.pincode}
                  </span>
                </label>
              ))}
            </div>
          )}

          {showAddressForm && (
            <div className="address-form">
              <h2>Add Delivery Address</h2>

              <label>Recipient Name</label>
              <input
                type="text"
                name="recipientName"
                value={addressForm.recipientName}
                onChange={handleAddressChange}
                required
              />

              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={addressForm.phone}
                onChange={handleAddressChange}
                required
              />

              <label>Address Line 1</label>
              <input
                type="text"
                name="addressLine1"
                value={addressForm.addressLine1}
                onChange={handleAddressChange}
                placeholder="House number, street, area"
                required
              />

              <label>Address Line 2 (optional)</label>
              <input
                type="text"
                name="addressLine2"
                value={addressForm.addressLine2}
                onChange={handleAddressChange}
                placeholder="Landmark, building, floor"
              />

              <label>City</label>
              <input
                type="text"
                name="city"
                value={addressForm.city}
                onChange={handleAddressChange}
                required
              />

              <label>State</label>
              <select
                name="state"
                value={addressForm.state}
                onChange={handleAddressChange}
                required
              >
                <option value="Gujarat">Gujarat</option>
              </select>
              <p className="delivery-coverage-note">
                FarmLink deliveries are currently available only in Gujarat.
              </p>

              <label>6-Digit Pincode</label>
              <input
                type="text"
                name="pincode"
                value={addressForm.pincode}
                onChange={handleAddressChange}
                minLength="6"
                maxLength="6"
                pattern="[0-9]{6}"
                required
              />

              <label>
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={addressForm.isDefault}
                  onChange={handleAddressChange}
                />{" "}
                Make this my default address
              </label>

              <button
                className="farmer-btn"
                type="button"
                onClick={saveAddress}
                disabled={savingAddress}
              >
                {savingAddress ? "Saving Address..." : "Save Address"}
              </button>
            </div>
          )}

          <hr />

          <h2>Payment Method</h2>

          <label>
            <input
              type="radio"
              name="paymentMethod"
              value="COD"
              checked={paymentMethod === "COD"}
              onChange={(event) => setPaymentMethod(event.target.value)}
            />{" "}
            Cash on Delivery (COD)
          </label>

          <label>
            <input
              type="radio"
              name="paymentMethod"
              value="ONLINE"
              checked={paymentMethod === "ONLINE"}
              onChange={(event) => setPaymentMethod(event.target.value)}
            />{" "}
            Pay Online by UPI, card, or net banking (Razorpay)
          </label>

          <button
            className="register-btn full-width"
            type="submit"
            disabled={placingOrder || cartItems.length === 0}
          >
            {placingOrder
              ? "Processing..."
              : paymentMethod === "ONLINE"
              ? `Pay ₹${orderTotal.toFixed(2)}`
              : `Place Cash on Delivery Order (₹${orderTotal.toFixed(2)})`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Checkout;
