import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import CancellationModal from "../components/CancellationModal";
import { getProductImage, handleImageError } from "../productImages";

function hasSuccessfulOnlinePayment(order) {
  if (!order || order.paymentMethod !== "ONLINE") return false;
  const status = String(order.paymentStatus || "").toUpperCase();
  return status === "PAID" || status === "SUCCESS";
}

function FarmerOrders() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );
  const accountType = currentUser?.accountType;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api("/orders/notifications");
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // Keep notifications resilient
    }
  }, []);

  const loadOrders = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError("");
      const data = await api("/orders/mine");
      setOrders(Array.isArray(data) ? data : []);
      await loadNotifications();
    } catch (requestError) {
      if (!isSilent) setError(requestError.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [loadNotifications]);

  useEffect(() => {
    if (accountType === "farmer") {
      loadOrders();
      const interval = setInterval(() => loadOrders(true), 6000);
      return () => clearInterval(interval);
    }
  }, [accountType, loadOrders]);

  async function openNotification(notification) {
    try {
      if (!notification.isRead) {
        await api(`/orders/notifications/${notification.id}/read`, {
          method: "PATCH",
        });
        setNotifications((current) =>
          current.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
      }
      if (notification.orderId) {
        navigate(`/orders/${notification.orderId}/tracking`);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function acceptOrder(orderId) {
    try {
      await api(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Accepted" }),
      });
      alert("Order confirmed! Nearby delivery riders will now be notified for pickup.");
      await loadOrders();
    } catch (err) {
      alert(err.message);
    }
  }

  async function cancelOrder({ reason, customReason }) {
    try {
      setIsCancelling(true);
      const result = await api(`/orders/${cancellingOrderId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason, customReason }),
      });
      setOrders((currentOrders) =>
        currentOrders.filter((order) => order.id !== cancellingOrderId)
      );
      alert(result.message);
      setCancellingOrderId(null);
      await loadOrders();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsCancelling(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("farmlinkToken");
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  const safeOrders = Array.isArray(orders) ? orders : [];

  const filteredOrders = safeOrders.filter((order) => {
    if (!order) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return order.status === "Pending";
    if (statusFilter === "accepted") return ["Accepted", "Going to Farmer", "Reached Farmer"].includes(order.status);
    if (statusFilter === "shipping") return ["Picked Up", "In Transit", "Out for Delivery"].includes(order.status);
    if (statusFilter === "delivered") return order.status === "Delivered";
    if (statusFilter === "cancelled") return ["Cancelled", "CANCELLED_BY_BUYER"].includes(order.status);
    return true;
  });

  const getRiderStatusLabel = (status) => {
    switch (status) {
      case "Going to Farmer":
        return "🛵 Rider On Way to Farm";
      case "Reached Farmer":
        return "📍 Rider Arrived at Your Farm";
      case "Picked Up":
      case "In Transit":
        return "🚚 In Transit to Buyer";
      case "Out for Delivery":
        return "📍 Out for Final Delivery";
      case "Delivered":
        return "✓ Delivered & Completed";
      default:
        return status;
    }
  };

  if (!currentUser || accountType !== "farmer") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in as a farmer to view your orders.</p>
          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <h2>🌱 FarmLink</h2>
        <Link to="/" className="sidebar-nav-item">🏠 Home</Link>
        <Link to="/farmer-dashboard" className="sidebar-nav-item">🌾 My Products</Link>
        <Link to="/farmer-orders" className="sidebar-nav-item is-active">
          📦 Orders Received {orders.length > 0 && <span className="nav-count-badge">{orders.length}</span>}
        </Link>
        <Link to="/add-product" className="sidebar-nav-item">➕ Add Product</Link>
        <Link to="/farmer-notifications" className="sidebar-nav-item">
          🔔 Notifications {unreadNotificationCount > 0 && <span className="nav-count-badge alert">{unreadNotificationCount}</span>}
        </Link>
        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <p className="section-tag">FARMER HARVEST ORDERS</p>
            <h1>Orders Received</h1>
            <p>Confirm harvest orders and monitor delivery partner pickup progress.</p>
          </div>

          <div className="dashboard-header-actions">
            <button
              className="admin-refresh"
              onClick={() => loadOrders(false)}
              disabled={loading}
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>
        </div>

        {/* Notifications Drawer */}
        {notificationsOpen && (
          <section className="product-section order-notifications" aria-live="polite">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Dispatch & Order Notifications</h2>
              <button
                type="button"
                className="close-drawer-btn"
                onClick={() => setNotificationsOpen(false)}
              >
                ✕ Close
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="muted-text">You have no notifications.</p>
            ) : (
              <div className="notification-list">
                {notifications.map((notification) => (
                  <button
                    className={`order-notification ${
                      notification.isRead ? "is-read" : "is-unread"
                    }`}
                    key={notification.id}
                    type="button"
                    onClick={() => openNotification(notification)}
                  >
                    <strong>{notification.title || "Dispatch Alert"}</strong>
                    <span>{notification.message}</span>
                    <time dateTime={notification.createdAt}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </time>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Order Status Filters */}
        <div className="farmer-orders-filter-bar">
          <button
            className={`filter-btn ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All Orders ({safeOrders.length})
          </button>
          <button
            className={`filter-btn ${statusFilter === "pending" ? "active" : ""}`}
            onClick={() => setStatusFilter("pending")}
          >
            Pending Confirmation ({safeOrders.filter((o) => o.status === "Pending").length})
          </button>
          <button
            className={`filter-btn ${statusFilter === "accepted" ? "active" : ""}`}
            onClick={() => setStatusFilter("accepted")}
          >
            Pickup & Rider Assigned ({safeOrders.filter((o) => ["Accepted", "Going to Farmer", "Reached Farmer"].includes(o.status)).length})
          </button>
          <button
            className={`filter-btn ${statusFilter === "shipping" ? "active" : ""}`}
            onClick={() => setStatusFilter("shipping")}
          >
            In Transit ({safeOrders.filter((o) => ["Picked Up", "In Transit", "Out for Delivery"].includes(o.status)).length})
          </button>
          <button
            className={`filter-btn ${statusFilter === "delivered" ? "active" : ""}`}
            onClick={() => setStatusFilter("delivered")}
          >
            Delivered ({safeOrders.filter((o) => o.status === "Delivered").length})
          </button>
          <button
            className={`filter-btn ${statusFilter === "cancelled" ? "active" : ""}`}
            onClick={() => setStatusFilter("cancelled")}
          >
            Cancelled ({safeOrders.filter((o) => ["Cancelled", "CANCELLED_BY_BUYER"].includes(o.status)).length})
          </button>
        </div>

        {error && (
          <div className="admin-error" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{error}</span>
            {error.toLowerCase().includes("token") || error.toLowerCase().includes("login") ? (
              <Link to="/login" style={{ padding: "4px 10px", background: "#b91c1c", color: "#fff", borderRadius: "4px", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}>
                Log in again
              </Link>
            ) : (
              <button type="button" onClick={() => loadOrders(false)} style={{ padding: "4px 10px", background: "#b91c1c", color: "#fff", border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                Retry
              </button>
            )}
          </div>
        )}

        <section className="product-section">
          {loading && orders.length === 0 ? (
            <p className="muted-text">Loading orders...</p>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-product">
              <div>📦</div>
              <h3>No orders found</h3>
              <p>When buyers order your crops, they will appear here for confirmation and delivery.</p>
            </div>
          ) : (
            <div className="farmer-orders-grid">
              {filteredOrders.map((order) => {
                const itemsList = order.items && order.items.length > 0
                  ? order.items
                  : [{
                      id: `legacy-${order.id}`,
                      productName: order.productName || "Farm Produce",
                      productCategory: order.productCategory || "Vegetables",
                      productUnit: order.productUnit || "kg",
                      quantity: order.quantity || 1,
                      unitPrice: order.unitPrice || 0,
                      total: order.total || 0,
                    }];

                const isPaid = String(order.paymentStatus || "").toUpperCase() === "PAID";
                const isCancelled = ["Cancelled", "CANCELLED_BY_BUYER"].includes(order.status);
                const hasRider = Boolean(order.deliveryBoyName);

                return (
                  <article className="farmer-order-card" key={order.id}>
                    {/* Top Row: Order ID, Date, Status Pill */}
                    <div className="farmer-order-card-header">
                      <div className="farmer-order-card-title-group">
                        <span className="farmer-order-id">ORDER #{order.id}</span>
                        {order.trackingCode && (
                          <span className="farmer-order-code-pill">{order.trackingCode}</span>
                        )}
                        <span className="farmer-order-date">
                          {new Date(order.createdAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>

                      <div className="farmer-order-status-group">
                        <span className={`farmer-order-status-badge status-${order.status.toLowerCase().replace(/\s+/g, "-")}`}>
                          {order.status}
                        </span>
                        <div className="farmer-order-total-amount">
                          ₹{Number(order.total || 0).toLocaleString("en-IN")}
                        </div>
                        <span className={`farmer-order-payment-pill ${isPaid ? "is-paid" : "is-pending"}`}>
                          {order.paymentMethod || "COD"} · {order.paymentStatus || "PENDING"}
                        </span>
                      </div>
                    </div>

                    {/* Buyer & Delivery Details */}
                    <div className="farmer-order-buyer-box">
                      <div>
                        <strong>Buyer:</strong> {order.businessName || order.deliveryName || "Business Buyer"}{" "}
                        {order.deliveryPhone && <a href={`tel:${order.deliveryPhone}`}>({order.deliveryPhone})</a>}
                      </div>
                      {order.deliveryAddress && (
                        <div style={{ flex: "1 1 240px" }}>
                          <strong>Delivery Address:</strong> {order.deliveryAddress}
                        </div>
                      )}
                    </div>

                    {/* Delivery Partner Profile Card (When Rider Accepted / Assigned) */}
                    {hasRider ? (
                      <div className="farmer-rider-status-card">
                        <div className="farmer-rider-info-row">
                          <div className="farmer-rider-avatar">
                            {order.deliveryBoyName.charAt(0).toUpperCase()}
                          </div>
                          <div className="farmer-rider-details">
                            <span className="rider-tag">🛵 Assigned Delivery Partner</span>
                            <h4>{order.deliveryBoyName}</h4>
                            <span className="rider-vehicle-text">
                              {order.deliveryBoyVehicle || "Bike"} {order.deliveryBoyVehicleNumber ? `(${order.deliveryBoyVehicleNumber})` : ""}
                            </span>
                          </div>
                          <div className="farmer-rider-status-pill">
                            <span className="status-indicator-dot" />
                            <strong>{getRiderStatusLabel(order.status)}</strong>
                          </div>
                        </div>

                        <div className="farmer-rider-actions">
                          {order.deliveryBoyPhone && (
                            <a className="rider-call-btn" href={`tel:${order.deliveryBoyPhone}`}>
                              📞 Call Rider ({order.deliveryBoyPhone})
                            </a>
                          )}
                          <Link className="rider-track-link" to={`/orders/${order.id}/tracking`}>
                            🗺️ View Live GPS Map ↗
                          </Link>
                        </div>

                        {order.deliveryEta && !["Delivered", "Cancelled", "CANCELLED_BY_BUYER"].includes(order.status) && (
                          <div className="farmer-eta-pill">
                            <span className="eta-icon">⏱️</span>
                            <span>
                              Estimated Transit Duration: <strong>{order.deliveryEta.estimatedDurationText}</strong> ({order.deliveryEta.distanceKm}) · Buyer Arrival: {order.deliveryEta.estimatedArrivalTime}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      order.status === "Accepted" && (
                        <div className="farmer-rider-pending-card">
                          <span>📡 Broadcasted on Radar: Waiting for nearby delivery partner to accept pickup…</span>
                          {order.deliveryEta && (
                            <div style={{ marginTop: "6px", fontSize: "12px", color: "#78350f" }}>
                              ⏱️ Est. Buyer Delivery Duration after Pickup: <strong>{order.deliveryEta.estimatedDurationText}</strong> ({order.deliveryEta.distanceKm})
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {/* Grouped Products Table / List */}
                    <div className="farmer-order-items-wrapper">
                      <div className="farmer-order-items-header">
                        <span>Produce</span>
                        <span>Product Name</span>
                        <span style={{ textAlign: "center" }}>Qty</span>
                        <span style={{ textAlign: "right" }}>Unit Price</span>
                        <span style={{ textAlign: "right" }}>Total</span>
                      </div>

                      {itemsList.map((item, idx) => (
                        <div className="farmer-order-item-row" key={item?.id || idx}>
                          <img
                            className="farmer-order-item-img"
                            src={getProductImage(item?.productCategory || "Vegetables", item?.productName || "Produce")}
                            alt={item?.productName || "Produce"}
                            onError={(e) => handleImageError(e, item?.productCategory || "Vegetables", item?.productName || "Produce")}
                          />
                          <div className="farmer-order-item-info">
                            <strong>{item?.productName || "Produce"}</strong>
                            {Number(item?.discountAmount || 0) > 0 && (
                              <span className="wholesale-badge">
                                Wholesale {item?.discountPct || 0}% OFF
                              </span>
                            )}
                          </div>
                          <div className="farmer-order-item-qty">
                            {item?.quantity || 1} {item?.productUnit || "kg"}
                          </div>
                          <div className="farmer-order-item-unitprice">
                            ₹{Number(item?.unitPrice || 0).toLocaleString("en-IN")}/{item?.productUnit || "kg"}
                          </div>
                          <div className="farmer-order-item-subtotal">
                            ₹{Number(item?.total || 0).toLocaleString("en-IN")}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer Actions (Farmer confirms order or views tracking; NO Start Delivery button) */}
                    <div className="farmer-order-footer">
                      <div>
                        {hasSuccessfulOnlinePayment(order) && (
                          <p className="paid-order-cancellation-notice" style={{ margin: 0 }}>
                            Paid online (non-cancellable)
                          </p>
                        )}
                      </div>

                      <div className="farmer-order-actions">
                        <Link className="btn-tracking-view" to={`/orders/${order.id}/tracking`}>
                          View Live Tracking →
                        </Link>

                        {order.status === "Pending" && (
                          <>
                            <button
                              className="btn-confirm-harvest"
                              onClick={() => acceptOrder(order.id)}
                            >
                              ✓ Confirm & Accept Order
                            </button>
                            <button
                              className="btn-cancel-order"
                              onClick={() => setCancellingOrderId(order.id)}
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {order.status === "Accepted" && !hasRider && !hasSuccessfulOnlinePayment(order) && (
                          <button
                            className="btn-cancel-order"
                            onClick={() => setCancellingOrderId(order.id)}
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {cancellingOrderId && (
        <CancellationModal
          role="seller"
          orderId={cancellingOrderId}
          onClose={() => setCancellingOrderId(null)}
          onConfirm={cancelOrder}
          submitting={isCancelling}
        />
      )}
    </div>
  );
}

export default FarmerOrders;
