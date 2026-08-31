import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { getProductImage, handleImageError } from "../productImages";

const deliverySteps = [
  { status: "Pending", label: "Order placed", icon: "1" },
  { status: "Accepted", label: "Order confirmed", icon: "2" },
  { status: "Out for Delivery", label: "Out for delivery", icon: "3" },
  { status: "Delivered", label: "Delivered", icon: "✓" },
];

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function OrderTracking() {
  const { id } = useParams();
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedOtp, setCopiedOtp] = useState(false);

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );
  const dashboardPath =
    currentUser?.accountType === "farmer"
      ? "/farmer-orders"
      : "/my-orders";

  const loadTracking = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      setErrorMessage("");
      const data = await api(`/orders/${id}/tracking`);
      setTrackingData(data);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadTracking();
    const intervalId = window.setInterval(loadTracking, 30000);
    return () => window.clearInterval(intervalId);
  }, [loadTracking]);

  const deliveryState = useMemo(() => {
    if (!trackingData) return { activeIndex: 0, cancelled: false };
    const cancelled = ["Cancelled", "CANCELLED_BY_BUYER"].includes(trackingData.order.status);
    const activeIndex = deliverySteps.findIndex(
      (step) => step.status === trackingData.order.status
    );
    return { activeIndex: Math.max(activeIndex, 0), cancelled };
  }, [trackingData]);

  if (loading) {
    return (
      <main className="tracking-page">
        <section className="tracking-shell tracking-loading" aria-live="polite">
          <span className="tracking-spinner" />
          <p>Loading your order journey…</p>
        </section>
      </main>
    );
  }

  if (errorMessage || !trackingData) {
    return (
      <main className="tracking-page">
        <section className="tracking-shell tracking-error">
          <div className="tracking-error-icon">!</div>
          <h1>We could not load this order</h1>
          <p>{errorMessage || "Please try again in a moment."}</p>
          <Link className="farmer-btn" to={dashboardPath}>
            Back to my orders
          </Link>
        </section>
      </main>
    );
  }

  const { order, items, events, latestLocation } = trackingData;
  const itemsList = items && items.length > 0
    ? items
    : (order.items && order.items.length > 0
      ? order.items
      : [{
          id: `legacy-${order.id}`,
          productName: order.productName,
          productCategory: order.productCategory,
          productUnit: order.productUnit,
          quantity: order.quantity,
          unitPrice: order.unitPrice,
          total: order.total,
          discountAmount: order.discountAmount,
          farmerName: order.farmerName,
        }]);
  const mapLink = latestLocation
    ? `https://www.google.com/maps?q=${latestLocation.latitude},${latestLocation.longitude}`
    : null;
  const farmMapLink = order.farmLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.farmLocation)}`
    : null;
  const directionsLink = latestLocation
    ? `https://www.google.com/maps/dir/?api=1&origin=${latestLocation.latitude},${latestLocation.longitude}&destination=${encodeURIComponent(order.deliveryAddress)}`
    : farmMapLink
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(order.farmLocation)}&destination=${encodeURIComponent(order.deliveryAddress)}`
      : null;
  const statusText = deliveryState.cancelled
    ? "This order was cancelled"
    : order.status === "Delivered"
      ? "Order complete"
      : order.status === "Out for Delivery"
        ? "Your order is on the way"
        : order.status === "Awaiting Payment"
          ? "Waiting for payment"
          : "Your order is being prepared";

  const handleCopyOtp = () => {
    if (order.deliveryOtp) {
      navigator.clipboard?.writeText(String(order.deliveryOtp));
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2500);
    }
  };

  return (
    <main className="tracking-page">
      <section className="tracking-shell">
        <header className="tracking-header">
          <Link className="tracking-back" to={dashboardPath}>← My orders</Link>
          <button
            className="tracking-refresh"
            type="button"
            onClick={() => loadTracking(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "↻ Refresh"}
          </button>
        </header>

        <div className="tracking-title-row">
          <div>
            <p className="tracking-eyebrow">ORDER #{order.id}</p>
            <h1>{statusText}</h1>
            <p className="tracking-subtitle">Updates refresh automatically every 30 seconds.</p>
          </div>
          <span className={`tracking-status status-${order.status.toLowerCase().replaceAll(" ", "-")}`}>
            {order.status}
          </span>
        </div>

        <section className={`tracking-progress ${deliveryState.cancelled ? "is-cancelled" : ""}`} aria-label="Order progress">
          {deliverySteps.map((step, index) => {
            const complete = !deliveryState.cancelled && index <= deliveryState.activeIndex;
            const current = !deliveryState.cancelled && index === deliveryState.activeIndex;
            return (
              <div className={`tracking-step ${complete ? "is-complete" : ""} ${current ? "is-current" : ""}`} key={step.status}>
                <div className="tracking-step-marker">{complete ? "✓" : step.icon}</div>
                <div>
                  <strong>{step.label}</strong>
                  <span>{current ? "Current stage" : complete ? "Complete" : "Upcoming"}</span>
                </div>
              </div>
            );
          })}
        </section>

        {deliveryState.cancelled && (
          <div className="tracking-notice tracking-notice-warning">This order has been cancelled. Contact the farmer if you need help.</div>
        )}

        {order.deliveryOtp && order.status === "Out for Delivery" && (
          <section className="delivery-otp-banner" aria-label="Delivery Confirmation OTP">
            <div className="otp-banner-glow" />
            <div className="otp-banner-content">
              <div className="otp-banner-header">
                <span className="otp-shield-badge">🔐 Delivery Confirmation OTP</span>
                <span className="otp-status-pill">Ready for Delivery</span>
              </div>
              <p className="otp-banner-title">
                Share this 4-digit secret OTP with the farmer/delivery partner to successfully confirm and complete your delivery.
              </p>
              <div className="otp-display-row">
                <div className="otp-code-boxes" aria-label={`OTP: ${order.deliveryOtp}`}>
                  {String(order.deliveryOtp).split("").map((digit, idx) => (
                    <span className="otp-code-box" key={idx}>{digit}</span>
                  ))}
                </div>
                <button
                  type="button"
                  className="otp-copy-btn"
                  onClick={handleCopyOtp}
                >
                  {copiedOtp ? "✓ Copied" : "📋 Copy OTP"}
                </button>
              </div>
              <p className="otp-security-note">
                🛡️ <strong>Important:</strong> The farmer cannot mark the order as delivered without entering this code. Only share it after you receive and inspect your produce.
              </p>
            </div>
          </section>
        )}

        {/* Grouped Produce Items in this Order */}
        <section
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "18px 20px",
            marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            <h2 style={{ fontSize: "16px", margin: 0, color: "#166534" }}>
              🛒 Products in this Order ({itemsList.length})
            </h2>
            <strong style={{ fontSize: "16px", color: "#1e293b" }}>
              Total: ₹{Number(order.total).toLocaleString("en-IN")}
            </strong>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {itemsList.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "14px",
                  padding: "10px 14px",
                  background: "#f8fafc",
                  borderRadius: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <img
                    src={getProductImage(item.productCategory, item.productName)}
                    alt={item.productName || "Produce"}
                    onError={(e) => handleImageError(e, item.productCategory, item.productName)}
                    style={{ width: "42px", height: "42px", borderRadius: "8px", objectFit: "cover" }}
                  />
                  <div>
                    <strong style={{ fontSize: "15px", color: "#1e293b" }}>{item.productName}</strong>
                    {item.farmerName && (
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Farmer: {item.farmerName}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#166534" }}>
                    ₹{Number(item.total).toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {item.quantity} {item.productUnit || "kg"} @ ₹{Number(item.unitPrice).toLocaleString("en-IN")}/{item.productUnit || "kg"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="tracking-grid">
          <section className="tracking-panel tracking-timeline-panel">
            <div className="tracking-panel-heading">
              <div>
                <p className="tracking-eyebrow">LIVE UPDATES</p>
                <h2>Order timeline</h2>
              </div>
            </div>
            <ol className="tracking-timeline">
              {events.length === 0 ? (
                <li className="muted-text">No delivery updates yet.</li>
              ) : events.map((event) => (
                <li key={event.id}>
                  <span className="timeline-dot" />
                  <div>
                    <strong>{event.status}</strong>
                    <p>{event.note}</p>
                    <time>{formatDate(event.createdAt)}</time>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <aside className="tracking-side">
            <section className="tracking-panel tracking-details">
              <p className="tracking-eyebrow">DELIVERY DETAILS</p>
              <h2>Delivering to</h2>
              <strong>{order.deliveryName}</strong>
              <p>{order.deliveryAddress}</p>
              <a href={`tel:${order.deliveryPhone}`}>{order.deliveryPhone}</a>
              <div className="tracking-detail-divider" />
              <span>Payment</span>
              <strong>{order.paymentMethod} · {order.paymentStatus}</strong>
              <span>Tracking code</span>
              <strong>{order.trackingCode || "Will be assigned soon"}</strong>
              <div className="tracking-detail-divider" />
              <span>Farm location</span>
              <strong>{order.farmLocation || "Farm location is not available"}</strong>
              {farmMapLink && <a href={farmMapLink} target="_blank" rel="noreferrer">View farmer's farm ↗</a>}
            </section>

            <section className="tracking-panel tracking-location">
              <p className="tracking-eyebrow">DELIVERY LOCATION</p>
              <h2>{latestLocation ? "Driver location shared" : "Location not shared yet"}</h2>
              {latestLocation ? (
                <>
                  <p>{latestLocation.note}</p>
                  <time>Updated {formatDate(latestLocation.createdAt)}</time>
                  <a className="tracking-map-link" href={mapLink} target="_blank" rel="noreferrer">Open live location ↗</a>
                  {directionsLink && <a className="tracking-map-link" href={directionsLink} target="_blank" rel="noreferrer">Directions to delivery address ↗</a>}
                </>
              ) : (
                <>
                  <p>The farmer's location will appear here when delivery starts.</p>
                  {directionsLink && <a className="tracking-map-link" href={directionsLink} target="_blank" rel="noreferrer">View farm-to-delivery route ↗</a>}
                </>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default OrderTracking;
