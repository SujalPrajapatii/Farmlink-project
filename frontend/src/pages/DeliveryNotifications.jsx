import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function DeliveryNotifications() {
  const navigate = useNavigate();
  const [currentUser] = useState(() =>
    JSON.parse(localStorage.getItem("farmlinkCurrentUser") || "null")
  );
  const accountType = currentUser?.accountType;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', 'unread', 'dispatch', 'pickup', 'delivered'
  const [search, setSearch] = useState("");
  const [dismissingId, setDismissingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rider, setRider] = useState(() => currentUser || {});

  const loadNotifications = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [notifsData, dashData] = await Promise.all([
        api("/orders/notifications"),
        api("/delivery/dashboard").catch(() => null),
      ]);
      setNotifications(Array.isArray(notifsData) ? notifsData : []);
      if (dashData?.rider) {
        setRider(dashData.rider);
      }
    } catch (err) {
      if (!isSilent) alert(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.id && accountType === "delivery") {
      loadNotifications();
      const interval = setInterval(() => loadNotifications(true), 8000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.id, accountType, loadNotifications]);

  // Mark single notification as read without navigating away
  async function handleMarkRead(e, n) {
    if (e) e.stopPropagation();
    if (n.isRead) return;
    try {
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
      );
      await api(`/orders/notifications/${n.id}/read`, { method: "PATCH" });
    } catch (err) {
      console.error("Mark read error:", err);
      await loadNotifications(true);
    }
  }

  // Dismiss / Delete single notification when "X" is clicked
  async function handleDismiss(e, notificationId) {
    e.stopPropagation();
    try {
      setDismissingId(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      await api(`/orders/notifications/${notificationId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Delete notification error:", err);
      await loadNotifications(true);
    } finally {
      setDismissingId(null);
    }
  }

  // Mark all notifications as read
  async function handleMarkAllRead() {
    try {
      setActionLoading(true);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await api("/orders/notifications/read-all", { method: "PATCH" });
    } catch (err) {
      alert(err.message);
      await loadNotifications(true);
    } finally {
      setActionLoading(false);
    }
  }

  // Clear all notifications
  async function handleClearAll() {
    if (!window.confirm("Are you sure you want to clear all delivery notifications?")) return;
    try {
      setActionLoading(true);
      setNotifications([]);
      await api("/orders/notifications/all", { method: "DELETE" });
    } catch (err) {
      alert(err.message);
      await loadNotifications(true);
    } finally {
      setActionLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("farmlinkToken");
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  if (!currentUser || accountType !== "delivery") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Delivery Access Only</h1>
          <p>Please log in with a verified delivery partner account to view fleet notifications.</p>
          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Filter categorization
  const filteredNotifications = notifications.filter((n) => {
    const text = `${n.title || ""} ${n.message || ""} ${n.type || ""}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === "unread") return !n.isRead;
    if (filter === "dispatch") {
      return (
        n.type?.includes("ASSIGN") ||
        n.type?.includes("DISPATCH") ||
        n.type?.includes("ACCEPTED") ||
        n.title?.toLowerCase().includes("dispatch") ||
        n.title?.toLowerCase().includes("assigned") ||
        n.title?.toLowerCase().includes("accepted")
      );
    }
    if (filter === "pickup") {
      return (
        n.type?.includes("PICKUP") ||
        n.type?.includes("FARM") ||
        n.type?.includes("ARRIVED") ||
        n.type?.includes("TRANSIT") ||
        n.title?.toLowerCase().includes("pickup") ||
        n.title?.toLowerCase().includes("farm") ||
        n.title?.toLowerCase().includes("transit")
      );
    }
    if (filter === "delivered") {
      return (
        n.type?.includes("DELIVER") ||
        n.title?.toLowerCase().includes("delivered") ||
        n.title?.toLowerCase().includes("completed")
      );
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type = "", title = "") => {
    const combined = `${type} ${title}`.toLowerCase();
    if (combined.includes("assign") || combined.includes("dispatch") || combined.includes("new order")) return "🚨";
    if (combined.includes("arrived") || combined.includes("pickup") || combined.includes("farmer")) return "📍";
    if (combined.includes("transit") || combined.includes("out for delivery")) return "🚚";
    if (combined.includes("delivered") || combined.includes("completed")) return "✓";
    if (combined.includes("cancel")) return "⚠️";
    return "🔔";
  };

  const getNotificationBadgeClass = (type = "", title = "") => {
    const combined = `${type} ${title}`.toLowerCase();
    if (combined.includes("assign") || combined.includes("dispatch")) return "badge-rider";
    if (combined.includes("pickup") || combined.includes("farmer")) return "badge-pickup";
    if (combined.includes("transit")) return "badge-transit";
    if (combined.includes("delivered")) return "badge-delivered";
    if (combined.includes("cancel")) return "badge-cancelled";
    return "badge-default";
  };

  return (
    <div className="dashboard-page delivery-dashboard-page delivery-notifications-page">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <h2>🌱 FarmLink Fleet</h2>
        <div className="rider-mini-profile">
          <div className="rider-avatar">
            {rider.name ? rider.name.charAt(0).toUpperCase() : "R"}
          </div>
          <div className="rider-name-group">
            <strong>{rider.name || "Delivery Partner"}</strong>
            <span>Verified Rider</span>
          </div>
        </div>

        <Link to="/" className="sidebar-nav-item">🏠 Home</Link>
        <Link to="/delivery-dashboard" state={{ tab: "active" }} className="sidebar-nav-item">📦 Active Deliveries</Link>
        <Link to="/delivery-dashboard" state={{ tab: "history" }} className="sidebar-nav-item">📜 Delivery History</Link>
        <Link to="/delivery-dashboard" state={{ tab: "profile" }} className="sidebar-nav-item">⚙️ Vehicle & Profile</Link>
        <Link to="/delivery-notifications" className="sidebar-nav-item is-active">
          🔔 Notifications {unreadCount > 0 && <span className="nav-count-badge alert">{unreadCount}</span>}
        </Link>
        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-content">
        <div className="notifications-container">
          {/* Top Header Row */}
          <header className="notifications-header">
            <div className="header-left">
              <Link className="back-link" to="/delivery-dashboard">
                ← Back to Fleet Dashboard
              </Link>
              <div className="title-row">
                <span className="bell-glow-icon">🛵</span>
                <div>
                  <h1>Rider Dispatch & Delivery Notifications</h1>
                  <p>Real-time alerts on new pickup requests, dispatch assignments, route changes, and delivery confirmations.</p>
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
                className={`filter-chip ${filter === "dispatch" ? "active" : ""}`}
                onClick={() => setFilter("dispatch")}
              >
                🚨 New Dispatches
              </button>
              <button
                type="button"
                className={`filter-chip ${filter === "pickup" ? "active" : ""}`}
                onClick={() => setFilter("pickup")}
              >
                📍 Farm Pickups
              </button>
              <button
                type="button"
                className={`filter-chip ${filter === "delivered" ? "active" : ""}`}
                onClick={() => setFilter("delivered")}
              >
                ✓ Completed Drops
              </button>
            </div>

            <div className="notification-search-box">
              <input
                type="text"
                placeholder="Search alerts by title or order…"
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
              <p>Fetching fleet dispatch notifications…</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="notifications-empty-state">
              <div className="empty-bell">🔕</div>
              <h3>No Notifications Found</h3>
              <p>
                {search
                  ? `No alerts match "${search}". Try searching with another keyword.`
                  : filter === "unread"
                  ? "You have zero unread notifications. All caught up!"
                  : "When admin assigns new pickup orders or farm dispatches to you, updates will appear here."}
              </p>
              <Link className="farmer-btn" to="/delivery-dashboard" style={{ marginTop: "14px", display: "inline-block" }}>
                Return to Fleet Dashboard
              </Link>
            </div>
          ) : (
            <div className="notifications-stream">
              {filteredNotifications.map((n) => {
                const icon = getNotificationIcon(n.type, n.title);
                const badgeClass = getNotificationBadgeClass(n.type, n.title);
                const isDismissing = dismissingId === n.id;

                return (
                  <article
                    className={`notification-card-item ${n.isRead ? "is-read" : "is-unread"} ${
                      isDismissing ? "slide-out-fade" : ""
                    }`}
                    key={n.id}
                    onClick={() => handleMarkRead(null, n)}
                  >
                    <div className={`notification-icon-bubble ${badgeClass}`}>
                      {icon}
                    </div>

                    <div className="notification-content-body">
                      <div className="notification-card-header">
                        <div className="title-and-badges">
                          <strong className="notification-title">{n.title || "Dispatch Alert"}</strong>
                          {!n.isRead && <span className="unread-dot-badge">NEW</span>}
                          {n.orderId && (
                            <span className="order-ref-pill">ORDER #{n.orderId}</span>
                          )}
                        </div>

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

                        <div className="notif-action-btn-group">
                          {!n.isRead && (
                            <button
                              type="button"
                              className="notif-mark-read-btn"
                              onClick={(e) => handleMarkRead(e, n)}
                            >
                              ✓ Mark as read
                            </button>
                          )}
                          {n.orderId && (
                            <>
                              <button
                                type="button"
                                className="notif-action-btn btn-map"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/orders/${n.orderId}/tracking`);
                                }}
                              >
                                🗺️ Live Route
                              </button>
                              <button
                                type="button"
                                className="notif-action-btn btn-dash"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate("/delivery-dashboard", { state: { tab: "active" } });
                                }}
                              >
                                ⚡ Fleet Dashboard
                              </button>
                            </>
                          )}
                        </div>
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
