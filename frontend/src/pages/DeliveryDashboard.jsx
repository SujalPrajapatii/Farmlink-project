import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";
import DeliveryOtpModal from "../components/DeliveryOtpModal";
import { getProductImage, handleImageError } from "../productImages";

const formatMoney = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;
const formatDate = (val) =>
  val ? new Date(val).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Recently";

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem("farmlinkCurrentUser") || "null");

  const [dashboardData, setDashboardData] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [ordersData, setOrdersData] = useState({ activeOrders: [], completedOrders: [] });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(
    () => location.state?.tab || (location.hash === "#profile" ? "profile" : location.hash === "#history" ? "history" : "active")
  );

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    } else if (location.hash === "#profile") {
      setActiveTab("profile");
    } else if (location.hash === "#history") {
      setActiveTab("history");
    }
  }, [location.state?.tab, location.hash]);

  // Live GPS tracking state
  const [isGpsTracking, setIsGpsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const [gpsStatusMessage, setGpsStatusMessage] = useState("");
  const locationWatchRef = useRef(null);
  const lastLocationSentRef = useRef(0);

  // Actions & OTP Modal
  const [deliveringOrder, setDeliveringOrder] = useState(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [actionInProgressOrderId, setActionInProgressOrderId] = useState(null);
  const [acceptingOrderId, setAcceptingOrderId] = useState(null);
  const [denyingOrderId, setDenyingOrderId] = useState(null);

  // Profile Edit State
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    vehicleType: "Bike",
    vehicleNumber: "",
    availabilityStatus: "AVAILABLE",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError("");

      const [dash, avail, orders, notifs] = await Promise.all([
        api("/delivery/dashboard"),
        api("/delivery/available-orders"),
        api("/delivery/orders"),
        api("/orders/notifications"),
      ]);

      setDashboardData(dash);
      setAvailableOrders(avail?.availableOrders || []);
      setOrdersData(orders || { activeOrders: [], completedOrders: [] });
      setNotifications(Array.isArray(notifs) ? notifs : []);

      if (dash?.rider) {
        setProfileForm({
          name: dash.rider.name || "",
          phone: dash.rider.phone || "",
          vehicleType: dash.rider.vehicleType || "Bike",
          vehicleNumber: dash.rider.vehicleNumber || "",
          availabilityStatus: dash.rider.availabilityStatus || "AVAILABLE",
        });
      }
    } catch (err) {
      if (!isSilent) setError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.accountType === "delivery") {
      loadData();
      const interval = setInterval(() => loadData(true), 5000);
      return () => clearInterval(interval);
    }
  }, [loadData, currentUser?.accountType]);

  // Toggle rider availability status (AVAILABLE, BUSY, OFFLINE)
  async function handleStatusChange(newStatus) {
    try {
      await api("/delivery/availability", {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setDashboardData((prev) =>
        prev
          ? {
              ...prev,
              availabilityStatus: newStatus,
              rider: { ...prev.rider, availabilityStatus: newStatus },
            }
          : prev
      );
      setProfileForm((prev) => ({ ...prev, availabilityStatus: newStatus }));
      const stored = JSON.parse(localStorage.getItem("farmlinkCurrentUser") || "{}");
      localStorage.setItem(
        "farmlinkCurrentUser",
        JSON.stringify({ ...stored, availabilityStatus: newStatus })
      );
      await loadData(true);
    } catch (err) {
      alert(err.message);
    }
  }

  // Real-time GPS Location sharing
  const sendLocationToServer = useCallback(async (coords, orderId = null) => {
    try {
      const targetOrderId = orderId || ordersData.activeOrders[0]?.id;
      if (!targetOrderId) return;

      await api(`/delivery/orders/${targetOrderId}/location`, {
        method: "POST",
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          speed: coords.speed || null,
          heading: coords.heading || null,
          accuracy: coords.accuracy || null,
          note: `Rider is live near (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
        }),
      });

      setCurrentCoords(coords);
      setLastLocationUpdate(new Date());
      setGpsStatusMessage(`GPS live signal sent at ${new Date().toLocaleTimeString()}`);
    } catch (e) {
      console.error("GPS send error:", e);
    }
  }, [ordersData.activeOrders]);

  function startGpsBroadcast() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    if (isGpsTracking) {
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
      setIsGpsTracking(false);
      setGpsStatusMessage("Live GPS broadcasting paused.");
      return;
    }

    setIsGpsTracking(true);
    setGpsStatusMessage("Starting GPS live broadcast…");

    locationWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentCoords(position.coords);
        const now = Date.now();
        if (now - lastLocationSentRef.current >= 10000) {
          lastLocationSentRef.current = now;
          sendLocationToServer(position.coords);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setGpsStatusMessage(`GPS: ${err.message}`);
        setIsGpsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );
  }

  // Single manual location broadcast button
  function handleManualLocationPing(orderId) {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await sendLocationToServer(pos.coords, orderId);
          alert("📍 Current GPS position broadcasted successfully to buyer & live tracking map!");
        } catch (e) {
          alert(e.message);
        }
      },
      (err) => alert(`Could not retrieve location: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  // Swiggy/Uber-style: Rider ACCEPTS an available order
  async function handleAcceptOrder(orderId) {
    try {
      setAcceptingOrderId(orderId);
      const res = await api(`/delivery/orders/${orderId}/accept`, {
        method: "POST",
      });
      alert(`🎉 Order #${orderId} Accepted! You are now navigating to the farm.`);
      // Start GPS broadcast automatically on accepting
      if (!isGpsTracking) {
        startGpsBroadcast();
      }
      await loadData(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setAcceptingOrderId(null);
    }
  }

  // Swiggy/Uber-style: Rider DENIES an available order
  async function handleDenyOrder(orderId) {
    try {
      setDenyingOrderId(orderId);
      await api(`/delivery/orders/${orderId}/deny`, {
        method: "POST",
      });
      // Remove from local list immediately
      setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      alert(err.message);
    } finally {
      setDenyingOrderId(null);
    }
  }

  // Advance Delivery Workflow State
  async function handleAdvanceWorkflow(orderId, newStatus) {
    try {
      setActionInProgressOrderId(orderId);
      await api(`/delivery/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      alert(`Status updated to: ${newStatus}`);
      await loadData(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionInProgressOrderId(null);
    }
  }

  // Complete delivery via Buyer OTP verification
  async function handleVerifyOtp(otp) {
    if (!deliveringOrder) return;
    setIsVerifyingOtp(true);
    try {
      await api(`/delivery/orders/${deliveringOrder.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Delivered", otp }),
      });
      alert("🎉 Order delivered successfully! Verified with buyer confirmation OTP.");
      setDeliveringOrder(null);
      // If no other active orders remain, stop GPS broadcast to save battery
      if (ordersData.activeOrders.length <= 1 && locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
        setIsGpsTracking(false);
      }
      await loadData(true);
    } catch (err) {
      throw err;
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  // Profile Save
  async function handleSaveProfile(e) {
    e.preventDefault();
    try {
      setProfileSaving(true);
      setProfileSuccess("");
      const res = await api("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(profileForm),
      });
      setProfileSuccess("Profile and vehicle details saved successfully!");
      if (res.user) {
        const stored = JSON.parse(localStorage.getItem("farmlinkCurrentUser") || "{}");
        localStorage.setItem("farmlinkCurrentUser", JSON.stringify({ ...stored, ...res.user }));
      }
      await loadData(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setProfileSaving(false);
    }
  }

  function handleLogout() {
    if (locationWatchRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
    }
    localStorage.removeItem("farmlinkToken");
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  if (!currentUser || currentUser.accountType !== "delivery") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Delivery Access Only</h1>
          <p>Please log in with a delivery rider partner account.</p>
          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const rider = dashboardData?.rider || {};
  const isOnline = dashboardData?.availabilityStatus === "AVAILABLE";
  const activeOrders = ordersData.activeOrders || [];
  const completedOrders = ordersData.completedOrders || [];
  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="dashboard-page delivery-dashboard-page">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <h2>🛵 FarmLink Fleet</h2>
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

        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`sidebar-nav-item ${activeTab === "active" ? "is-active" : ""}`}
        >
          📦 Active Deliveries {activeOrders.length > 0 && <span className="nav-count-badge">{activeOrders.length}</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`sidebar-nav-item ${activeTab === "history" ? "is-active" : ""}`}
        >
          📜 Delivery History {completedOrders.length > 0 && <span className="nav-count-badge">{completedOrders.length}</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`sidebar-nav-item ${activeTab === "profile" ? "is-active" : ""}`}
        >
          ⚙️ Vehicle & Profile
        </button>

        <Link
          to="/delivery-notifications"
          className="sidebar-nav-item"
        >
          🔔 Notifications {unreadNotifCount > 0 && <span className="nav-count-badge alert">{unreadNotifCount}</span>}
        </Link>

        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-content">
        {/* Top Header Row with Shift Status & Live GPS Switch */}
        <header className="delivery-hero-header">
          <div className="delivery-hero-info">
            <p className="section-tag">SWIGGY/UBER-STYLE FLEET DISPATCH</p>
            <h1>Rider Dashboard</h1>
            <p>Go Online to receive incoming pickup requests, navigate to farms, and start deliveries.</p>
          </div>

          <div className="delivery-header-controls">
            {/* Shift Availability Pill */}
            <div className="rider-availability-toggle">
              <span className="availability-label">Status:</span>
              <button
                type="button"
                className={`avail-btn avail-online ${dashboardData?.availabilityStatus === "AVAILABLE" ? "active" : ""}`}
                onClick={() => handleStatusChange("AVAILABLE")}
              >
                <span className="status-dot green" /> Online
              </button>
              <button
                type="button"
                className={`avail-btn avail-busy ${dashboardData?.availabilityStatus === "BUSY" ? "active" : ""}`}
                onClick={() => handleStatusChange("BUSY")}
              >
                <span className="status-dot yellow" /> Busy
              </button>
              <button
                type="button"
                className={`avail-btn avail-offline ${dashboardData?.availabilityStatus === "OFFLINE" ? "active" : ""}`}
                onClick={() => handleStatusChange("OFFLINE")}
              >
                <span className="status-dot grey" /> Offline
              </button>
            </div>

            {/* Live GPS Broadcast Switch */}
            <button
              type="button"
              className={`gps-broadcast-btn ${isGpsTracking ? "broadcasting" : ""}`}
              onClick={startGpsBroadcast}
              title="Broadcast GPS coordinates continuously"
            >
              <span className={`gps-indicator-pulse ${isGpsTracking ? "pulse-anim" : ""}`} />
              {isGpsTracking ? "📡 GPS Broadcasting (Live)" : "📍 Start Live GPS"}
            </button>
          </div>
        </header>

        {gpsStatusMessage && (
          <div className="gps-status-bar">
            <span>ℹ️ {gpsStatusMessage}</span>
            {lastLocationUpdate && (
              <small>Last sent: {lastLocationUpdate.toLocaleTimeString()}</small>
            )}
          </div>
        )}

        {/* Shift Metric Cards */}
        <section className="dashboard-stats delivery-stats">
          <div className="dashboard-stat-card">
            <p>Active Deliveries</p>
            <h2>{dashboardData?.activeOrdersCount || 0}</h2>
            <small>In-flight drops</small>
          </div>
          <div className="dashboard-stat-card">
            <p>Delivered Today</p>
            <h2>{dashboardData?.todayDeliveredCount || 0}</h2>
            <small>Completed today</small>
          </div>
          <div className="dashboard-stat-card">
            <p>Total Completed</p>
            <h2>{dashboardData?.totalDeliveredCount || 0}</h2>
            <small>All-time drops</small>
          </div>
          <div className="dashboard-stat-card highlight-card">
            <p>Estimated Earnings</p>
            <h2>{formatMoney(dashboardData?.estimatedEarnings || 0)}</h2>
            <small>Total payouts + incentives</small>
          </div>
        </section>

        {error && <div className="admin-error">{error}</div>}

        {/* ==================================================================== */}
        {/* SWIGGY/UBER STYLE: LIVE AVAILABLE ORDERS RADAR (WHEN ONLINE)        */}
        {/* ==================================================================== */}
        {isOnline && availableOrders.length > 0 && activeTab === "active" && (
          <section className="delivery-radar-section">
            <div className="radar-header">
              <div className="radar-title-group">
                <span className="radar-ping-dot" />
                <h2>⚡ Available Delivery Requests ({availableOrders.length})</h2>
              </div>
              <span className="radar-badge">LIVE RADAR BROADCAST</span>
            </div>

            <div className="available-orders-grid">
              {availableOrders.map((order) => {
                const isAccepting = acceptingOrderId === order.id;
                const isDenying = denyingOrderId === order.id;
                const isCod = order.paymentMethod === "COD";

                return (
                  <article className="available-order-card" key={order.id}>
                    <div className="available-card-top">
                      <div>
                        <span className="order-tag">NEW ORDER #{order.id}</span>
                        {order.trackingCode && (
                          <span className="order-code-pill">{order.trackingCode}</span>
                        )}
                      </div>
                      <strong className="available-amount">{formatMoney(order.total)}</strong>
                    </div>

                    <div className="available-route-preview">
                      <div className="route-node">
                        <span className="node-badge farm-badge">🌾 Farm Pickup:</span>
                        <div className="node-text">
                          <strong>{order.farmerName}</strong>
                          <p>{order.farmLocation}</p>
                        </div>
                      </div>

                      <div className="route-divider" />

                      <div className="route-node">
                        <span className="node-badge drop-badge">📍 Buyer Delivery:</span>
                        <div className="node-text">
                          <strong>{order.deliveryName || order.buyerName}</strong>
                          <p>{order.deliveryAddress}</p>
                        </div>
                      </div>
                    </div>

                    <div className="available-items-chips">
                      {order.items?.map((it, idx) => (
                        <span className="item-chip" key={idx}>
                          {it.productName} ({it.quantity} {it.productUnit || "kg"})
                        </span>
                      ))}
                    </div>

                    <div className="available-card-footer">
                      <span className={`payment-pill ${isCod ? "cod" : "paid"}`}>
                        {order.paymentMethod} · {order.paymentStatus}
                      </span>

                      <div className="available-card-actions">
                        <button
                          type="button"
                          className="btn-deny-order"
                          disabled={isDenying || isAccepting}
                          onClick={() => handleDenyOrder(order.id)}
                        >
                          {isDenying ? "Dismissing…" : "✕ Deny"}
                        </button>
                        <button
                          type="button"
                          className="btn-accept-order"
                          disabled={isAccepting || isDenying}
                          onClick={() => handleAcceptOrder(order.id)}
                        >
                          {isAccepting ? "Accepting…" : "✓ Accept Delivery"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Offline Banner when offline */}
        {!isOnline && activeTab === "active" && (
          <div className="delivery-offline-banner">
            <div className="offline-icon">⚪</div>
            <div>
              <h3>You are currently Offline</h3>
              <p>Switch your shift status to <strong>Online</strong> to start receiving live delivery requests in your area.</p>
            </div>
            <button
              type="button"
              className="farmer-btn"
              onClick={() => handleStatusChange("AVAILABLE")}
            >
              Go Online Now
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 1: ACTIVE ASSIGNED DELIVERIES                                    */}
        {/* ==================================================================== */}
        {activeTab === "active" && (
          <section className="product-section">
            <div className="section-heading" style={{ marginBottom: "20px" }}>
              <h2>Active Deliveries ({activeOrders.length})</h2>
              <button className="admin-refresh" onClick={() => loadData(false)} disabled={loading}>
                {loading ? "Refreshing…" : "↻ Refresh"}
              </button>
            </div>

            {loading && !dashboardData ? (
              <p className="muted-text">Loading assigned orders…</p>
            ) : activeOrders.length === 0 ? (
              <div className="empty-product">
                <div style={{ fontSize: "48px" }}>🛵</div>
                <h3>No active delivery in progress</h3>
                <p>
                  {isOnline
                    ? "You are Online! When a new harvest order is ready for pickup, it will appear in the Live Radar above."
                    : "Go Online to receive new order requests."}
                </p>
              </div>
            ) : (
              <div className="delivery-tasks-grid">
                {activeOrders.map((order) => {
                  const isCod = order.paymentMethod === "COD";
                  const isPaid = String(order.paymentStatus || "").toUpperCase() === "PAID";
                  const pickupMapUrl = order.farmLocation
                    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.farmLocation)}`
                    : null;
                  const dropMapUrl = order.deliveryAddress
                    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.deliveryAddress)}`
                    : null;

                  const isGoingToFarmer = ["Going to Farmer", "Delivery Boy Assigned"].includes(order.status);
                  const isReachedFarmer = order.status === "Reached Farmer";
                  const isPickedUp = order.status === "Picked Up";
                  const isInTransit = ["In Transit", "Out for Delivery"].includes(order.status);

                  return (
                    <article className="delivery-task-card" key={order.id}>
                      {/* Card Top Banner */}
                      <div className="delivery-card-top">
                        <div className="delivery-card-title-group">
                          <span className="order-tag">ORDER #{order.id}</span>
                          {order.trackingCode && (
                            <span className="order-code-pill">{order.trackingCode}</span>
                          )}
                          <span className={`status-badge stage-${order.status.toLowerCase().replace(/\s+/g, "-")}`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="delivery-card-total-group">
                          <strong className="delivery-amount">{formatMoney(order.total)}</strong>
                          <span className={`payment-tag ${isPaid ? "paid" : "cod"}`}>
                            {order.paymentMethod} · {order.paymentStatus}
                          </span>
                        </div>
                      </div>

                      {/* Swiggy/Uber-Style 6-Stage Delivery Progress Stepper */}
                      <div className="delivery-workflow-stepper">
                        <div className={`step-node ${["Going to Farmer", "Delivery Boy Assigned", "Reached Farmer", "Picked Up", "In Transit", "Out for Delivery", "Delivered"].includes(order.status) ? "active" : ""}`}>
                          <span className="node-icon">1</span>
                          <span className="node-label">Accepted</span>
                        </div>
                        <div className={`step-line ${["Going to Farmer", "Reached Farmer", "Picked Up", "In Transit", "Out for Delivery", "Delivered"].includes(order.status) ? "active" : ""}`} />
                        <div className={`step-node ${["Going to Farmer", "Reached Farmer", "Picked Up", "In Transit", "Out for Delivery", "Delivered"].includes(order.status) ? "active" : ""}`}>
                          <span className="node-icon">2</span>
                          <span className="node-label">Going to Farm</span>
                        </div>
                        <div className={`step-line ${["Reached Farmer", "Picked Up", "In Transit", "Out for Delivery", "Delivered"].includes(order.status) ? "active" : ""}`} />
                        <div className={`step-node ${["Reached Farmer", "Picked Up", "In Transit", "Out for Delivery", "Delivered"].includes(order.status) ? "active" : ""}`}>
                          <span className="node-icon">3</span>
                          <span className="node-label">Reached Farm</span>
                        </div>
                        <div className={`step-line ${["Picked Up", "In Transit", "Out for Delivery", "Delivered"].includes(order.status) ? "active" : ""}`} />
                        <div className={`step-node ${["Picked Up", "In Transit", "Out for Delivery", "Delivered"].includes(order.status) ? "active" : ""}`}>
                          <span className="node-icon">4</span>
                          <span className="node-label">In Transit</span>
                        </div>
                        <div className={`step-line ${order.status === "Delivered" ? "active" : ""}`} />
                        <div className={`step-node ${order.status === "Delivered" ? "active" : ""}`}>
                          <span className="node-icon">✓</span>
                          <span className="node-label">Delivered</span>
                        </div>
                      </div>

                      {/* Dual Location Panels: Pickup (Farm) & Delivery (Buyer) */}
                      <div className="delivery-route-panels">
                        {/* Farm Pickup Box */}
                        <div className={`route-box pickup-box ${isGoingToFarmer || isReachedFarmer ? "highlight-active-target" : ""}`}>
                          <div className="route-box-header">
                            <span className="box-type-badge pickup">🌾 1. Farm Pickup Point</span>
                            {isReachedFarmer && <span className="arrived-tag">✓ ARRIVED AT FARM</span>}
                          </div>
                          <h4>Farmer: {order.farmerName}</h4>
                          <p className="address-text">
                            <strong>Location:</strong> {order.farmLocation || "Farm location details on file"}
                          </p>
                          <div className="route-actions-row">
                            {order.farmerPhone && (
                              <a className="call-btn" href={`tel:${order.farmerPhone}`}>
                                📞 Call Farmer ({order.farmerPhone})
                              </a>
                            )}
                            {pickupMapUrl && (
                              <a className="nav-btn" href={pickupMapUrl} target="_blank" rel="noreferrer">
                                🧭 Navigate to Farm ↗
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Customer Dropoff Box */}
                        <div className={`route-box dropoff-box ${isInTransit ? "highlight-active-target" : ""}`}>
                          <div className="route-box-header">
                            <span className="box-type-badge dropoff">📍 2. Buyer Destination</span>
                          </div>
                          <h4>Customer: {order.deliveryName || order.buyerName}</h4>
                          <p className="address-text">
                            <strong>Address:</strong> {order.deliveryAddress}
                          </p>
                          <div className="route-actions-row">
                            {order.deliveryPhone && (
                              <a className="call-btn" href={`tel:${order.deliveryPhone}`}>
                                📞 Call Buyer ({order.deliveryPhone})
                              </a>
                            )}
                            {dropMapUrl && (
                              <a className="nav-btn" href={dropMapUrl} target="_blank" rel="noreferrer">
                                🧭 Navigate to Buyer ↗
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Produce Items in this Order */}
                      <div className="delivery-order-items-preview">
                        <span className="items-title">Produce Checklist:</span>
                        <div className="delivery-items-chips">
                          {order.items?.map((it, idx) => (
                            <div className="delivery-item-chip" key={idx}>
                              <img
                                src={getProductImage(it.productCategory, it.productName)}
                                alt={it.productName}
                                onError={(e) => handleImageError(e, it.productCategory, it.productName)}
                              />
                              <span>
                                {it.productName} <strong>({it.quantity} {it.productUnit || "kg"})</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* COD Collection Alert */}
                      {isCod && !isPaid && (
                        <div className="cod-cash-alert">
                          💵 <strong>Cash on Delivery (COD) Reminder:</strong> Collect{" "}
                          <strong>{formatMoney(order.total)}</strong> in cash upon final handover.
                        </div>
                      )}

                      {/* Action Progression Controls */}
                      <div className="delivery-action-footer">
                        <div className="left-quick-actions">
                          <button
                            type="button"
                            className="btn-ping-gps"
                            onClick={() => handleManualLocationPing(order.id)}
                            title="Share instant GPS coordinates with buyer"
                          >
                            📍 Ping Live Location
                          </button>
                          <Link className="btn-view-map" to={`/orders/${order.id}/tracking`}>
                            View Map Tracker →
                          </Link>
                        </div>

                        <div className="right-workflow-buttons">
                          {/* Step 1: Navigating to Farm -> Trigger Arrival */}
                          {isGoingToFarmer && (
                            <>
                              {pickupMapUrl && (
                                <a className="btn-navigate-primary" href={pickupMapUrl} target="_blank" rel="noreferrer">
                                  🧭 Navigate to Farmer
                                </a>
                              )}
                              <button
                                type="button"
                                className="btn-workflow-primary btn-reached-farm"
                                disabled={actionInProgressOrderId === order.id}
                                onClick={() => handleAdvanceWorkflow(order.id, "Reached Farmer")}
                              >
                                📍 I have Reached Farmer
                              </button>
                            </>
                          )}

                          {/* Step 2: At Farm -> Start Delivery (Pick Up & Depart) */}
                          {isReachedFarmer && (
                            <button
                              type="button"
                              className="btn-workflow-primary btn-start-delivery-prominent"
                              disabled={actionInProgressOrderId === order.id}
                              onClick={() => handleAdvanceWorkflow(order.id, "In Transit")}
                            >
                              🚚 Start Delivery (Picked Up)
                            </button>
                          )}

                          {/* Step 3: Picked Up -> In Transit */}
                          {isPickedUp && (
                            <button
                              type="button"
                              className="btn-workflow-primary btn-start-delivery-prominent"
                              disabled={actionInProgressOrderId === order.id}
                              onClick={() => handleAdvanceWorkflow(order.id, "In Transit")}
                            >
                              🚚 Start Delivery
                            </button>
                          )}

                          {/* Step 4: In Transit -> OTP Handover Confirmation */}
                          {isInTransit && (
                            <>
                              {dropMapUrl && (
                                <a className="btn-navigate-primary" href={dropMapUrl} target="_blank" rel="noreferrer">
                                  🧭 Navigate to Buyer
                                </a>
                              )}
                              <button
                                type="button"
                                className="btn-workflow-complete"
                                onClick={() => setDeliveringOrder(order)}
                              >
                                🔐 Enter Buyer OTP & Complete Delivery
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: DELIVERY HISTORY                                              */}
        {/* ==================================================================== */}
        {activeTab === "history" && (
          <section className="product-section">
            <div className="section-heading" style={{ marginBottom: "20px" }}>
              <h2>Delivered Orders History ({completedOrders.length})</h2>
              <button className="admin-refresh" onClick={() => loadData(false)}>
                ↻ Refresh
              </button>
            </div>

            {completedOrders.length === 0 ? (
              <div className="empty-product">
                <div style={{ fontSize: "48px" }}>📜</div>
                <h3>No completed deliveries yet</h3>
                <p>Completed orders will appear here with delivery timestamps and earnings.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="delivery-history-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Produce</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                      <th>Delivered Time</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedOrders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>#{o.id}</strong>
                          <br />
                          <small className="muted-text">{o.trackingCode}</small>
                        </td>
                        <td>
                          <strong>{o.deliveryName || o.buyerName}</strong>
                          <br />
                          <small>{o.deliveryPhone}</small>
                        </td>
                        <td>{o.productSummary || "Fresh Produce"}</td>
                        <td>
                          <strong>{formatMoney(o.total)}</strong>
                          <br />
                          <small>{o.paymentMethod} / {o.paymentStatus}</small>
                        </td>
                        <td>
                          <span className={`status-badge stage-${o.status.toLowerCase().replace(/\s+/g, "-")}`}>
                            {o.status}
                          </span>
                        </td>
                        <td>{formatDate(o.deliveredAt || o.createdAt)}</td>
                        <td>
                          <Link className="btn-table-track" to={`/orders/${o.id}/tracking`}>
                            View Timeline →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: VEHICLE & PROFILE SETTINGS                                    */}
        {/* ==================================================================== */}
        {activeTab === "profile" && (
          <section className="product-section vehicle-profile-section">
            <div className="section-heading" style={{ marginBottom: "22px" }}>
              <div>
                <h2>Rider Profile & Vehicle Settings</h2>
                <p className="muted-text" style={{ marginTop: "4px" }}>
                  Manage your verified fleet profile, registered vehicle specs, and shift availability.
                </p>
              </div>
            </div>

            <div className="delivery-profile-container">
              {/* Left Column: Vehicle & Rider Info Showcase Card */}
              <div className="vehicle-info-card">
                <div className="vehicle-card-top">
                  <div className="vehicle-big-icon">
                    {profileForm.vehicleType?.includes("Scooter")
                      ? "🛵"
                      : profileForm.vehicleType?.includes("Electric")
                      ? "⚡"
                      : profileForm.vehicleType?.includes("Van") || profileForm.vehicleType?.includes("Truck")
                      ? "🚚"
                      : profileForm.vehicleType?.includes("Bicycle")
                      ? "🚲"
                      : "🏍️"}
                  </div>
                  <div className="vehicle-meta">
                    <span className="rider-verified-badge" style={{ marginBottom: "4px", display: "inline-flex" }}>
                      ✓ Verified Fleet Partner
                    </span>
                    <h3>{profileForm.name || rider.name || "Delivery Partner"}</h3>
                    <span className="vehicle-type-tag">
                      {profileForm.vehicleType || "Motorcycle / Bike"}
                    </span>
                  </div>
                </div>

                {/* License Plate Graphic */}
                <div className="vehicle-plate-wrapper">
                  <span className="vehicle-field-label">Vehicle Registration Plate</span>
                  <div className="vehicle-plate-box">
                    <span className="plate-ind">IND</span>
                    <span className="plate-number">
                      {profileForm.vehicleNumber?.trim() ? profileForm.vehicleNumber.toUpperCase() : "GJ-01-AB-1234"}
                    </span>
                    <span className="plate-state-emblem">🇮🇳</span>
                  </div>
                </div>

                {/* Live Shift Availability Status Pill */}
                <div className="vehicle-status-block">
                  <span className="vehicle-field-label">Current Dispatch Status</span>
                  <div className={`vehicle-shift-pill shift-${profileForm.availabilityStatus?.toLowerCase()}`}>
                    <span className={`status-dot ${profileForm.availabilityStatus === "AVAILABLE" ? "green" : profileForm.availabilityStatus === "BUSY" ? "yellow" : "grey"}`} />
                    <strong>
                      {profileForm.availabilityStatus === "AVAILABLE"
                        ? "🟢 Online (Accepting Pickups)"
                        : profileForm.availabilityStatus === "BUSY"
                        ? "🟡 Busy (On Active Delivery)"
                        : "⚪ Offline (Off Shift)"}
                    </strong>
                  </div>
                </div>

                {/* Performance & Shift Stats Mini Grid */}
                <div className="vehicle-stats-row">
                  <div className="vehicle-stat-mini">
                    <span>Lifetime Drops</span>
                    <strong>{dashboardData?.totalDeliveredCount || 0}</strong>
                  </div>
                  <div className="vehicle-stat-mini">
                    <span>Today's Drops</span>
                    <strong>{dashboardData?.todayDeliveredCount || 0}</strong>
                  </div>
                  <div className="vehicle-stat-mini">
                    <span>Active Drops</span>
                    <strong>{dashboardData?.activeOrdersCount || 0}</strong>
                  </div>
                  <div className="vehicle-stat-mini">
                    <span>Est. Payout</span>
                    <strong>{formatMoney(dashboardData?.estimatedEarnings || 0)}</strong>
                  </div>
                </div>

                <div className="vehicle-support-note">
                  <span>🛡️</span>
                  <p>FarmLink Rider Protection & Transit Insurance active on all assigned deliveries.</p>
                </div>
              </div>

              {/* Right Column: Settings & Profile Edit Form */}
              <form className="delivery-profile-form" onSubmit={handleSaveProfile}>
                {profileSuccess && (
                  <div className="admin-success-box" style={{ marginBottom: "20px" }}>
                    ✓ {profileSuccess}
                  </div>
                )}

                <h3 className="profile-form-subtitle">👤 Personal & Contact Details</h3>

                <div className="form-grid-two">
                  <div className="form-group">
                    <label>Full Legal Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      placeholder="e.g. Jay Patel"
                      required
                    />
                    <small className="form-hint">Name displayed on dispatch tickets and buyer delivery receipts.</small>
                  </div>

                  <div className="form-group">
                    <label>Primary Phone Number</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      required
                    />
                    <small className="form-hint">Farmers and buyers will call this number during delivery handovers.</small>
                  </div>
                </div>

                <hr className="profile-form-divider" />

                <h3 className="profile-form-subtitle">🛵 Vehicle & Fleet Specs</h3>

                <div className="form-grid-two">
                  <div className="form-group">
                    <label>Vehicle Type</label>
                    <select
                      value={profileForm.vehicleType}
                      onChange={(e) => setProfileForm({ ...profileForm, vehicleType: e.target.value })}
                    >
                      <option value="Motorcycle / Bike">🏍️ Motorcycle / Bike</option>
                      <option value="Scooter">🛵 Scooter</option>
                      <option value="Electric Scooter">⚡ Electric Scooter</option>
                      <option value="Delivery Van / Mini Truck">🚚 Delivery Van / Mini Truck</option>
                      <option value="Bicycle">🚲 Bicycle</option>
                    </select>
                    <small className="form-hint">Used by dispatch algorithm to match harvest cargo volume.</small>
                  </div>

                  <div className="form-group">
                    <label>Vehicle Registration / Plate Number</label>
                    <input
                      type="text"
                      value={profileForm.vehicleNumber}
                      onChange={(e) => setProfileForm({ ...profileForm, vehicleNumber: e.target.value })}
                      placeholder="e.g. GJ-01-AB-1234"
                    />
                    <small className="form-hint">Official RTO registration number verified by FarmLink Admin.</small>
                  </div>
                </div>

                <hr className="profile-form-divider" />

                <h3 className="profile-form-subtitle">🚦 Availability & Shift Settings</h3>

                <div className="form-group">
                  <label>Shift Availability Status</label>
                  <select
                    value={profileForm.availabilityStatus}
                    onChange={(e) => setProfileForm({ ...profileForm, availabilityStatus: e.target.value })}
                  >
                    <option value="AVAILABLE">🟢 Available / Online (Receive incoming farm pickup requests)</option>
                    <option value="BUSY">🟡 Busy (On active order delivery / picking up)</option>
                    <option value="OFFLINE">⚪ Offline (Off Shift / Taking a break)</option>
                  </select>
                  <small className="form-hint">When Online, dispatch towers and nearby farmers can route orders to you.</small>
                </div>

                <button type="submit" className="farmer-btn profile-submit-btn" disabled={profileSaving}>
                  {profileSaving ? "Saving Settings…" : "💾 Save Rider Profile & Vehicle Settings"}
                </button>
              </form>
            </div>
          </section>
        )}
      </main>

      {/* Delivery Confirmation OTP Modal */}
      {deliveringOrder && (
        <DeliveryOtpModal
          order={deliveringOrder}
          onClose={() => setDeliveringOrder(null)}
          onConfirm={handleVerifyOtp}
          submitting={isVerifyingOtp}
        />
      )}
    </div>
  );
}
