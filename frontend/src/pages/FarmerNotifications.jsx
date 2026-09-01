import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function FarmerNotifications() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );
  const accountType = currentUser?.accountType;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', 'unread', 'riders', 'orders'
  const [search, setSearch] = useState("");
  const [dismissingId, setDismissingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadNotifications = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const data = await api("/orders/notifications");
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!isSilent) alert(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accountType === "farmer") {
      loadNotifications();
      const interval = setInterval(() => loadNotifications(true), 6000);
      return () => clearInterval(interval);
    }
  }, [accountType, loadNotifications]);

  // Dismiss / Delete single notification when "✕" is clicked
  async function handleDismiss(e, notificationId) {
    e.stopPropagation();
    try {
      setDismissingId(notificationId);
      // Remove immediately from UI for instant feedback
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      await api(`/orders/notifications/${notificationId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Delete notification error:", err);
      await loadNotifications(true);
    } finally {
      setDismissingId(null);
    }
  }

  // Mark single notification as read and navigate to tracking/orders
  async function handleNotificationClick(n) {
    try {
      if (!n.isRead) {
        await api(`/orders/notifications/${n.id}/read`, { method: "PATCH" });
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
        );
      }
      if (n.orderId) {
        navigate(`/orders/${n.orderId}/tracking`);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  // Mark all notifications as read
  async function handleMarkAllRead() {
    try {
      setActionLoading(true);
      await api("/orders/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Clear all notifications
  async function handleClearAll() {
    if (!window.confirm("Are you sure you want to clear all notifications?")) return;
    try {
      setActionLoading(true);
      await api("/orders/notifications/all", { method: "DELETE" });
      setNotifications([]);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("farmlinkToken");
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  if (!currentUser || accountType !== "farmer") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in as a farmer to view notifications.</p>
          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Filter categorization
  const filteredNotifications = notifications.filter((n) => {
    const text = `${n.title} ${n.message} ${n.type}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === "unread") return !n.isRead;
    if (filter === "riders") {
      return (
        n.type?.includes("RIDER") ||
        n.type?.includes("PICKUP") ||
        n.type?.includes("ARRIVED") ||
        n.type?.includes("DEPARTED")
      );
    }
    if (filter === "orders") {
      return (
        n.type?.includes("ORDER") ||
        n.type?.includes("CANCEL") ||
        n.type?.includes("CONFIRM")
      );
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type = "") => {
    if (type.includes("RIDER_ACCEPTED")) return "🛵";
    if (type.includes("RIDER_ARRIVED") || type.includes("PICKUP")) return "📍";
    if (type.includes("DEPARTED") || type.includes("IN_TRANSIT")) return "🚚";
    if (type.includes("DELIVERED")) return "✓";
    if (type.includes("CANCEL")) return "⚠️";
    return "🌾";
  };

  const getNotificationBadgeClass = (type = "") => {
    if (type.includes("RIDER_ACCEPTED")) return "badge-rider";
    if (type.includes("RIDER_ARRIVED") || type.includes("PICKUP")) return "badge-pickup";
    if (type.includes("DEPARTED") || type.includes("IN_TRANSIT")) return "badge-transit";
    if (type.includes("DELIVERED")) return "badge-delivered";
    if (type.includes("CANCEL")) return "badge-cancelled";
    return "badge-default";
  };

  return (
    <div className="dashboard-page farmer-notifications-page">
      {/* Farmer Sidebar Navigation */}
      <aside className="sidebar">
        <h2>🌱 FarmLink</h2>
        <Link to="/" className="sidebar-nav-item">🏠 Home</Link>
        <Link to="/farmer-dashboard" className="sidebar-nav-item">🌾 My Products</Link>
        <Link to="/farmer-orders" className="sidebar-nav-item">📦 Orders Received</Link>
        <Link to="/add-product" className="sidebar-nav-item">➕ Add Product</Link>
        <Link to="/farmer-notifications" className="sidebar-nav-item is-active">
          🔔 Notifications {unreadCount > 0 && <span className="nav-count-badge alert">{unreadCount}</span>}
        </Link>
        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* Main Notification Center Area */}
      <main className="dashboard-content">
        <div className="notifications-container farmer-container">
          <header className="notifications-header">
            <div className="header-left">
              <Link className="back-link" to="/farmer-orders">
                ← Back to Received Orders
              </Link>
              <div className="title-row">
                <span className="bell-glow-icon">🌾</span>
                <div>
                  <h1>Farmer Harvest & Dispatch Alerts</h1>
                  <p>Real-time updates on buyer orders, rider arrivals at your farm, and delivery handovers.</p>
                </div>
              </div>
            </div>

            <div className="header-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="btn-mark-all-read"
                  onClick={handleMarkAllRead}
                  disabled={actionLoading}
                >
                  ✓ Mark All Read ({unreadCount})
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  className="btn-clear-all"
                  onClick={handleClearAll}
                  disabled={actionLoading}
                >
                  🗑️ Clear All
                </button>
              )}
            </div>
          </header>

          {/* Control Bar: Filters & Search */}
          <div className="notifications-control-bar">
            <div className="filter-chips">
              <button
                type="button"
                className={`filter-chip ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                className={`filter-chip ${filter === "unread" ? "active" : ""}`}
                onClick={() => setFilter("unread")}
              >
                Unread ({unreadCount})
              </button>
              <button
                type="button"
                className={`filter-chip ${filter === "riders" ? "active" : ""}`}
                onClick={() => setFilter("riders")}
              >
                🛵 Rider Pickup Alerts
              </button>
              <button
                type="button"
                className={`filter-chip ${filter === "orders" ? "active" : ""}`}
                onClick={() => setFilter("orders")}
              >
                📦 Harvest Orders
              </button>
            </div>

            <div className="notification-search-box">
              <input
                type="text"
                placeholder="Search farmer alerts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="clear-search" onClick={() => setSearch("")}>
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Notifications Stream */}
          {loading && notifications.length === 0 ? (
            <div className="notifications-empty-state">
              <span className="spinner-icon">↻</span>
              <p>Loading notifications…</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="notifications-empty-state">
              <div className="empty-bell">🌾</div>
              <h3>No alerts found</h3>
              <p>
                {search
                  ? "No alerts match your search query."
                  : filter === "unread"
                  ? "All clear! You have no unread notifications."
                  : "When buyers place harvest orders or delivery partners accept pickups, updates will appear here."}
              </p>
            </div>
          ) : (
            <div className="notifications-stream">
              {filteredNotifications.map((n) => {
                const icon = getNotificationIcon(n.type);
                const badgeClass = getNotificationBadgeClass(n.type);
                const isDismissing = dismissingId === n.id;

                return (
                  <article
                    className={`notification-card-item ${n.isRead ? "is-read" : "is-unread"} ${
                      isDismissing ? "slide-out-fade" : ""
                    }`}
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className={`notification-icon-bubble ${badgeClass}`}>
                      {icon}
                    </div>

                    <div className="notification-content-body">
                      <div className="notification-card-header">
                        <div className="title-and-badges">
                          <strong className="notification-title">{n.title || "Harvest Update"}</strong>
                          {!n.isRead && <span className="unread-dot-badge">NEW</span>}
                          {n.orderId && (
                            <span className="order-ref-pill">ORDER #{n.orderId}</span>
                          )}
                        </div>

                        {/* Top Right "✕" Dismiss Button */}
                        <button
                          type="button"
                          className="btn-dismiss-x"
                          title="Dismiss alert"
                          onClick={(e) => handleDismiss(e, n.id)}
                        >
                          ✕
                        </button>
                      </div>

                      <p className="notification-message-text">{n.message}</p>

                      <div className="notification-card-footer">
                        <time className="notification-timestamp">
                          {new Date(n.createdAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </time>

                        {n.orderId && (
                          <span className="track-order-link">
                            View Order & Pickup Map →
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
