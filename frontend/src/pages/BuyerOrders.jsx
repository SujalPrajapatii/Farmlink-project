import { api } from "../api";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CancellationModal from "../components/CancellationModal";
import { getProductImage, handleImageError } from "../productImages";

function hasSuccessfulOnlinePayment(order) {
  const paymentStatus = String(order.paymentStatus || "").toUpperCase();
  return order.paymentMethod === "ONLINE" && ["PAID", "SUCCESS"].includes(paymentStatus);
}

function BuyerOrders() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const accountType = currentUser?.accountType;

  const [orders, setOrders] = useState([]);
  const [orderSummary, setOrderSummary] = useState({
    totalOrders: 0,
    completedOrders: 0,
    completedTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [cart] = useState(() => JSON.parse(localStorage.getItem("farmlinkCart") || "[]"));
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (accountType !== "business") return;

    let active = true;
    let firstLoad = true;

    async function loadOrdersData() {
      try {
        if (firstLoad) setLoading(true);
        const [ordersData, summaryData, notificationsData] = await Promise.all([
          api("/orders/mine"),
          api("/orders/summary"),
          api("/orders/notifications"),
        ]);

        if (!active) return;
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setOrderSummary(summaryData || { totalOrders: 0, completedOrders: 0, completedTotal: 0 });
        setNotifications(Array.isArray(notificationsData) ? notificationsData : []);
      } catch (error) {
        if (firstLoad && active) console.error("Error loading buyer orders:", error);
      } finally {
        if (active) setLoading(false);
        firstLoad = false;
      }
    }

    loadOrdersData();
    window.addEventListener("focus", loadOrdersData);
    const refreshId = window.setInterval(loadOrdersData, 5000);

    return () => {
      active = false;
      window.removeEventListener("focus", loadOrdersData);
      window.clearInterval(refreshId);
    };
  }, [accountType]);

  if (!currentUser || accountType !== "business") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in as a business buyer to view your orders.</p>
          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadNotificationCount = safeNotifications.filter((notification) => notification && !notification.isRead).length;

  async function openNotification(notification) {
    try {
      if (!notification.isRead) {
        await api(`/orders/notifications/${notification.id}/read`, { method: "PATCH" });
        setNotifications((currentNotifications) => (Array.isArray(currentNotifications) ? currentNotifications : []).map((current) => (
          current.id === notification.id ? { ...current, isRead: true } : current
        )));
      }
      navigate(`/orders/${notification.orderId}/tracking`);
    } catch (error) {
      alert(error.message);
    }
  }

  async function dismissNotification(notificationId, e) {
    if (e) e.stopPropagation();
    try {
      setNotifications((current) => (Array.isArray(current) ? current.filter((n) => n.id !== notificationId) : []));
      await api(`/orders/notifications/${notificationId}`, { method: "DELETE" });
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
    }
  }

  function handleLogout() {
    localStorage.removeItem("farmlinkToken");
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  async function cancelOrder({ reason, customReason }) {
    try {
      setIsCancelling(true);
      const result = await api(`/orders/${cancellingOrderId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason, customReason }),
      });
      setOrders((currentOrders) =>
        (Array.isArray(currentOrders) ? currentOrders : []).filter((order) => order.id !== cancellingOrderId)
      );
      alert(result.message);
      setCancellingOrderId(null);
      const [updatedOrders, summaryData] = await Promise.all([
        api("/orders/mine"),
        api("/orders/summary"),
      ]);
      setOrders(Array.isArray(updatedOrders) ? updatedOrders : []);
      setOrderSummary(summaryData || { totalOrders: 0, completedOrders: 0, completedTotal: 0 });
    } catch (error) {
      alert(error.message);
    } finally {
      setIsCancelling(false);
    }
  }

  const filteredOrders = safeOrders.filter((order) => {
    if (!order) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return ["Pending", "Accepted", "Out for Delivery", "Awaiting Payment"].includes(order.status);
    if (statusFilter === "delivered") return order.status === "Delivered";
    if (statusFilter === "cancelled") return ["Cancelled", "CANCELLED_BY_BUYER"].includes(order.status);
    return true;
  });

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <h2>🌱 FarmLink</h2>
        <Link to="/">Home</Link>
        <Link to="/business-dashboard">Marketplace</Link>
        <Link to="/my-orders" style={{ background: "rgba(255,255,255,0.22)", color: "#fff", fontWeight: "800" }}>
          My Orders {orders.length > 0 && `(${orders.length})`}
        </Link>
        <button className="sidebar-cart" onClick={() => navigate("/checkout", { state: { cart } })}>
          🛒 Cart ({cart.length})
        </button>
        <button className="sidebar-cart" onClick={() => setNotificationsOpen((isOpen) => !isOpen)}>
          🔔 Notifications{unreadNotificationCount ? ` (${unreadNotificationCount})` : ""}
        </button>
        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header" style={{ marginBottom: "28px" }}>
          <div>
            <p className="section-tag">BUYER ORDERS</p>
            <h1>My Orders</h1>
            <p>Track your active farm purchases, view delivery details, and order history.</p>
          </div>
          <Link className="register-btn" to="/business-dashboard">
            + Order More Produce
          </Link>
        </div>

        <section className="market-order-stats" aria-label="Order summary" style={{ marginBottom: "30px" }}>
          <article>
            <span>Total orders</span>
            <strong>{orderSummary.totalOrders}</strong>
            <small>Orders placed</small>
          </article>
          <article>
            <span>Completed</span>
            <strong>{orderSummary.completedOrders}</strong>
            <small>Delivered successfully</small>
          </article>
          <article>
            <span>Total spent</span>
            <strong>₹{orderSummary.completedTotal.toLocaleString("en-IN")}</strong>
            <small>Delivered orders only</small>
          </article>
        </section>

        {notificationsOpen && (
          <section className="product-section order-notifications" aria-live="polite" style={{ marginBottom: "25px" }}>
            <h2>Order Notifications</h2>
            {notifications.length === 0 ? (
              <p className="muted-text">You have no notifications.</p>
            ) : (
              <div className="notification-list">
                {notifications.map((notification) => (
                  <div className="order-notification-wrapper" key={notification.id}>
                    <button
                      className={`order-notification ${notification.isRead ? "is-read" : "is-unread"}`}
                      type="button"
                      onClick={() => openNotification(notification)}
                    >
                      <strong>{notification.title || "Order Update"}</strong>
                      <span>{notification.message}</span>
                      <time dateTime={notification.createdAt}>
                        {new Date(notification.createdAt).toLocaleString()}
                      </time>
                    </button>
                    <button
                      className="notification-dismiss-btn"
                      type="button"
                      title="Dismiss notification"
                      aria-label="Dismiss notification"
                      onClick={(e) => dismissNotification(notification.id, e)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="product-section">
          <div className="section-heading" style={{ marginBottom: "20px" }}>
            <h2>Order History & Tracking</h2>
            <div className="market-category-pills" style={{ margin: 0 }}>
              <button
                className={statusFilter === "all" ? "is-active" : ""}
                onClick={() => setStatusFilter("all")}
              >
                All ({orders.length})
              </button>
              <button
                className={statusFilter === "active" ? "is-active" : ""}
                onClick={() => setStatusFilter("active")}
              >
                Active
              </button>
              <button
                className={statusFilter === "delivered" ? "is-active" : ""}
                onClick={() => setStatusFilter("delivered")}
              >
                Delivered
              </button>
              <button
                className={statusFilter === "cancelled" ? "is-active" : ""}
                onClick={() => setStatusFilter("cancelled")}
              >
                Cancelled
              </button>
            </div>
          </div>

          {loading ? (
            <p className="muted-text">Loading your orders...</p>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-product">
              <div>🧺</div>
              <h3>No orders found</h3>
              <p>{statusFilter === "all" ? "You have not placed any orders yet." : "No orders matching this status."}</p>
              <Link className="register-btn" to="/business-dashboard" style={{ marginTop: "14px", display: "inline-block" }}>
                Browse Marketplace
              </Link>
            </div>
          ) : (
            <div className="farmer-orders-container">
              {filteredOrders.map((order) => {
                const itemsList = order.items && order.items.length > 0
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
                    }];

                const isPaid = String(order.paymentStatus || "").toUpperCase() === "PAID";

                return (
                  <article className="farmer-order-card" key={order.id}>
                    {/* Order Top Header */}
                    <div className="farmer-order-header">
                      <div>
                        <div className="farmer-order-title-group">
                          <h3 className="farmer-order-id">
                            Order #{order.id}
                          </h3>
                          {order.trackingCode && (
                            <span className="farmer-order-code-badge">
                              {order.trackingCode}
                            </span>
                          )}
                          <span className={`status status-${String(order.status || "Pending").toLowerCase().replace(/\s+/g, "-")}`}>
                            {order.status || "Pending"}
                          </span>
                        </div>
                        <p className="farmer-order-date">
                          Ordered on {order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Recently"}
                        </p>
                      </div>

                      <div className="farmer-order-price-group">
                        <div className="farmer-order-total-amount">
                          ₹{Number(order.total || 0).toLocaleString("en-IN")}
                        </div>
                        <span className={`farmer-order-payment-pill ${isPaid ? "is-paid" : "is-pending"}`}>
                          {order.paymentMethod || "COD"} · {order.paymentStatus || "PENDING"}
                        </span>
                      </div>
                    </div>

                    {/* Delivery & OTP Info */}
                    <div className="farmer-order-buyer-box">
                      <div style={{ flex: "1 1 240px" }}>
                        <strong>Delivering to:</strong> {order.deliveryName || "Me"}{" "}
                        {order.deliveryPhone && `(${order.deliveryPhone})`} · {order.deliveryAddress}
                      </div>

                      {order.status === "Out for Delivery" && order.deliveryOtp && (
                        <div className="buyer-order-otp-pill" style={{ margin: 0 }} title="Share this OTP with driver on delivery">
                          <span className="otp-pill-icon">🔐</span>
                          <span>Delivery OTP:</span>
                          <strong>{order.deliveryOtp}</strong>
                        </div>
                      )}
                    </div>

                    {/* Grouped Products Table / List */}
                    <div className="farmer-order-items-wrapper">
                      <div className="buyer-order-items-header">
                        <span>Produce</span>
                        <span>Product Name</span>
                        <span>Farmer</span>
                        <span style={{ textAlign: "center" }}>Qty</span>
                        <span style={{ textAlign: "right" }}>Unit Price</span>
                        <span style={{ textAlign: "right" }}>Total</span>
                      </div>

                      {itemsList.map((item, idx) => (
                        <div className="buyer-order-item-row" key={item?.id || idx}>
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
                          <div className="buyer-order-item-farmer">
                            <span className="buyer-farmer-badge">
                              🧑‍🌾 {item?.farmerName || "Farmer"}
                            </span>
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

                    {/* Footer Actions */}
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
                          Track Order →
                        </Link>
                        {!hasSuccessfulOnlinePayment(order) && ["Awaiting Payment", "Pending", "Accepted"].includes(order.status) && (
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
          role="buyer"
          orderId={cancellingOrderId}
          onClose={() => setCancellingOrderId(null)}
          onConfirm={cancelOrder}
          submitting={isCancelling}
        />
      )}
    </div>
  );
}

export default BuyerOrders;
