import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function BuyerNotifications() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );
  const accountType = currentUser?.accountType;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', 'unread', 'delivery', 'orders'
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
    if (accountType === "business") {
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
      // Remove immediately from UI for instant snappy feedback
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      await api(`/orders/notifications/${notificationId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Delete notification error:", err);
      // Fallback reload
      await loadNotifications(true);
    } finally {
      setDismissingId(null);
    }
  }

  // Mark single notification as read and navigate to tracking if orderId
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

  if (!currentUser || accountType !== "business") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in as a business buyer to view notifications.</p>
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
    if (filter === "delivery") {
      return (
        n.type?.includes("RIDER") ||
        n.type?.includes("TRANSIT") ||
        n.type?.includes("DELIVERY") ||
        n.type?.includes("PICKUP")
      );
    }
    if (filter === "orders") {
      return (
        n.type?.includes("ORDER") ||
        n.type?.includes("CONFIRM") ||
        n.type?.includes("CANCEL")
      );
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type = "") => {
    if (type.includes("RIDER_ACCEPTED")) return "🛵";
    if (type.includes("RIDER_ARRIVED") || type.includes("PICKUP")) return "📍";
    if (type.includes("IN_TRANSIT") || type.includes("OUT_FOR_DELIVERY")) return "🚚";
    if (type.includes("DELIVERED")) return "✓";
    if (type.includes("CANCEL")) return "⚠️";
    return "🔔";
  };

  const getNotificationBadgeClass = (type = "") => {
    if (type.includes("RIDER_ACCEPTED")) return "badge-rider";
    if (type.includes("RIDER_ARRIVED") || type.includes("PICKUP")) return "badge-pickup";
    if (type.includes("IN_TRANSIT") || type.includes("OUT_FOR_DELIVERY")) return "badge-transit";
    if (type.includes("DELIVERED")) return "badge-delivered";
    if (type.includes("CANCEL")) return "badge-cancelled";
    return "badge-default";
  };

  return (
    <div className="notifications-page buyer-notifications-page">
      <div className="notifications-container">
        {/* Top Header Row */}
        <header className="notifications-header">
          <div className="header-left">
            <Link className="back-link" to="/business-dashboard">
              ← Back to Marketplace
            </Link>
            <div className="title-row">
              <span className="bell-glow-icon">🔔</span>
              <div>
                <h1>Buyer Notifications</h1>
                <p>Stay updated on fresh produce orders, rider assignment, and live delivery progress.</p>
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

        {/* Filters and Search Bar */}
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
              className={`filter-chip ${filter === "delivery" ? "active" : ""}`}
              onClick={() => setFilter("delivery")}
            >
              🛵 Delivery Updates
            </button>
            <button
              type="button"
              className={`filter-chip ${filter === "orders" ? "active" : ""}`}
              onClick={() => setFilter("orders")}
            >
              📦 Orders
            </button>
          </div>

          <div className="notification-search-box">
            <input
              type="text"
              placeholder="Search notifications…"
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

        {/* Notifications List */}
        {loading && notifications.length === 0 ? (
          <div className="notifications-empty-state">
            <span className="spinner-icon">↻</span>
            <p>Loading your notifications…</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notifications-empty-state">
            <div className="empty-bell">🔕</div>
            <h3>No notifications found</h3>
            <p>
              {search
                ? "No alerts match your search query."
                : filter === "unread"
                ? "You are all caught up! No unread notifications."
                : "When farmers confirm your orders or delivery partners are dispatched, updates will appear here."}
            </p>
            <Link className="farmer-btn" to="/business-dashboard" style={{ marginTop: "12px" }}>
              Explore Produce Marketplace
            </Link>
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
                        <strong className="notification-title">{n.title || "Order Update"}</strong>
                        {!n.isRead && <span className="unread-dot-badge">NEW</span>}
                        {n.orderId && (
                          <span className="order-ref-pill">ORDER #{n.orderId}</span>
                        )}
                      </div>

                      {/* Top Right "✕" Dismiss Button */}
                      <button
                        type="button"
                        className="btn-dismiss-x"
                        title="Dismiss notification"
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
                          Track Live GPS Map →
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
    </div>
  );
}
