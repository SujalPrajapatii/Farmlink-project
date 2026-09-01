import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import L from "leaflet";
import { api } from "../api";
import { getProductImage, handleImageError } from "../productImages";

const deliveryWorkflowSteps = [
  { status: "Pending", label: "Order Placed", icon: "1" },
  { status: "Accepted", label: "Farmer Confirmed", icon: "2" },
  { status: "Going to Farmer", label: "Rider Going to Farm", icon: "3" },
  { status: "Reached Farmer", label: "Reached Farm", icon: "4" },
  { status: "In Transit", label: "In Transit to You", icon: "5" },
  { status: "Out for Delivery", label: "Out for Delivery", icon: "6" },
  { status: "Delivered", label: "Delivered", icon: "✓" },
];

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

// Fallback coordinate mappings for common Gujarat / Western India locations
function getApproxCoordinates(locationStr, defaultLat = 23.0225, defaultLng = 72.5714) {
  if (!locationStr || typeof locationStr !== "string") return [defaultLat, defaultLng];
  const s = locationStr.toLowerCase();
  if (s.includes("ahmedabad") || s.includes("amdavad")) return [23.0225, 72.5714];
  if (s.includes("surat")) return [21.1702, 72.8311];
  if (s.includes("vadodara") || s.includes("baroda")) return [22.3072, 73.1812];
  if (s.includes("rajkot")) return [22.3039, 70.8022];
  if (s.includes("bhavnagar")) return [21.7645, 72.1519];
  if (s.includes("jamnagar")) return [22.4707, 70.0577];
  if (s.includes("junagadh")) return [21.5222, 70.4579];
  if (s.includes("gandhinagar")) return [23.2156, 72.6369];
  if (s.includes("anand")) return [22.5645, 72.9289];
  if (s.includes("navsari")) return [20.9500, 72.9300];
  if (s.includes("mehsana")) return [23.5880, 72.3693];
  if (s.includes("nashik")) return [19.9975, 73.7898];
  if (s.includes("mumbai")) return [19.0760, 72.8777];
  if (s.includes("pune")) return [18.5204, 73.8567];
  return [defaultLat, defaultLng];
}

function OrderTracking() {
  const { id } = useParams();
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedOtp, setCopiedOtp] = useState(false);

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );
  const dashboardPath =
    currentUser?.accountType === "farmer"
      ? "/farmer-orders"
      : currentUser?.accountType === "delivery"
      ? "/delivery-dashboard"
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
    const intervalId = window.setInterval(() => loadTracking(false), 6000);
    return () => window.clearInterval(intervalId);
  }, [loadTracking]);

  const deliveryState = useMemo(() => {
    if (!trackingData) return { activeIndex: 0, cancelled: false };
    const cancelled = ["Cancelled", "CANCELLED_BY_BUYER"].includes(trackingData.order.status);
    
    // Normalize status to step index
    let currentStatus = trackingData.order.status;
    if (currentStatus === "Delivery Boy Assigned") currentStatus = "Going to Farmer";
    if (currentStatus === "Picked Up") currentStatus = "In Transit";

    const activeIndex = deliveryWorkflowSteps.findIndex(
      (step) => step.status === currentStatus
    );
    return { activeIndex: Math.max(activeIndex, 0), cancelled };
  }, [trackingData]);

  // Leaflet Map Initialization and updates
  useEffect(() => {
    if (!mapContainerRef.current || !trackingData) return;

    const { order, deliveryBoy, latestLocation } = trackingData;

    // 1. Determine points
    const farmCoords = getApproxCoordinates(order.farmLocation, 22.5645, 72.9289);
    const dropCoords = getApproxCoordinates(order.deliveryAddress, 23.0225, 72.5714);

    let riderCoords = null;
    if (latestLocation?.latitude && latestLocation?.longitude) {
      riderCoords = [Number(latestLocation.latitude), Number(latestLocation.longitude)];
    } else if (deliveryBoy?.currentLatitude && deliveryBoy?.currentLongitude) {
      riderCoords = [Number(deliveryBoy.currentLatitude), Number(deliveryBoy.currentLongitude)];
    } else if (order.status === "Going to Farmer" || order.status === "Delivery Boy Assigned") {
      riderCoords = [farmCoords[0] + 0.015, farmCoords[1] - 0.015];
    } else if (order.status === "Reached Farmer") {
      riderCoords = [farmCoords[0], farmCoords[1]];
    } else if (["In Transit", "Picked Up", "Out for Delivery"].includes(order.status)) {
      riderCoords = [
        farmCoords[0] + (dropCoords[0] - farmCoords[0]) * 0.6,
        farmCoords[1] + (dropCoords[1] - farmCoords[1]) * 0.6,
      ];
    }

    // Initialize map if not yet initialized
    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: riderCoords || farmCoords,
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Clear old markers & lines
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    const allPoints = [];

    // Custom HTML Icons
    const createHtmlIcon = (iconHtml, className) =>
      L.divIcon({
        html: iconHtml,
        className: `custom-leaflet-icon ${className}`,
        iconSize: [44, 44],
        iconAnchor: [22, 44],
        popupAnchor: [0, -44],
      });

    // 1. Farm Marker
    const farmIcon = createHtmlIcon(
      `<div class="map-pin-badge farm-pin">
        <span class="pin-emoji">🌾</span>
        <span class="pin-label">Farm</span>
       </div>`,
      "farm-marker"
    );
    const farmMarker = L.marker(farmCoords, { icon: farmIcon })
      .addTo(map)
      .bindPopup(`<strong>🌾 Harvest Pickup Point</strong><br/>${order.farmLocation || "Farm Location"}`);
    markersRef.current.push(farmMarker);
    allPoints.push(farmCoords);

    // 2. Buyer Destination Marker
    const dropIcon = createHtmlIcon(
      `<div class="map-pin-badge drop-pin">
        <span class="pin-emoji">📍</span>
        <span class="pin-label">Buyer</span>
       </div>`,
      "drop-marker"
    );
    const dropMarker = L.marker(dropCoords, { icon: dropIcon })
      .addTo(map)
      .bindPopup(`<strong>📍 Buyer Delivery Destination</strong><br/>${order.deliveryName || "Recipient"}<br/>${order.deliveryAddress}`);
    markersRef.current.push(dropMarker);
    allPoints.push(dropCoords);

    // 3. Live Rider Marker (if rider is assigned/moving)
    if (riderCoords) {
      const isLiveSignal = Boolean(latestLocation?.latitude || deliveryBoy?.currentLatitude);
      const riderIcon = createHtmlIcon(
        `<div class="map-pin-badge rider-pin ${isLiveSignal ? "live-pulse" : ""}">
          ${isLiveSignal ? '<div class="pulse-ring"></div>' : ""}
          <span class="pin-emoji">🛵</span>
          <span class="pin-label">${deliveryBoy?.name ? deliveryBoy.name.split(" ")[0] : "Rider"}</span>
         </div>`,
        "rider-marker"
      );
      const riderMarker = L.marker(riderCoords, { icon: riderIcon })
        .addTo(map)
        .bindPopup(
          `<strong>🛵 Delivery Partner</strong><br/>${deliveryBoy?.name || "Rider"}<br/>${deliveryBoy?.phone || ""}<br/><em>Status: ${order.status}</em>`
        );
      markersRef.current.push(riderMarker);
      allPoints.push(riderCoords);

      // Contextual Polyline Route:
      if (order.status === "Going to Farmer" || order.status === "Delivery Boy Assigned") {
        // Route from Rider to Farm
        const routeLine = L.polyline([riderCoords, farmCoords], {
          color: "#0284c7",
          weight: 4,
          dashArray: "6, 8",
          opacity: 0.9,
        }).addTo(map);
        polylineRef.current = routeLine;
      } else {
        // Route from Farm to Rider to Buyer
        const routeLine = L.polyline([farmCoords, riderCoords, dropCoords], {
          color: "#166534",
          weight: 4,
          dashArray: "6, 8",
          opacity: 0.9,
        }).addTo(map);
        polylineRef.current = routeLine;
      }
    } else {
      // Direct line between Farm and Drop
      const routeLine = L.polyline([farmCoords, dropCoords], {
        color: "#22c55e",
        weight: 3,
        dashArray: "4, 6",
        opacity: 0.7,
      }).addTo(map);
      polylineRef.current = routeLine;
    }

    // Fit map bounds
    if (allPoints.length > 0) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50], maxZoom: 15 });
    }
  }, [trackingData]);

  // Clean up Leaflet map instance on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <main className="tracking-page">
        <section className="tracking-shell tracking-loading" aria-live="polite">
          <span className="tracking-spinner" />
          <p>Connecting to live dispatch & GPS tracker…</p>
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

  const { order, items, deliveryBoy, events, latestLocation } = trackingData;
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
        }]);

  const handleCopyOtp = () => {
    if (order.deliveryOtp) {
      navigator.clipboard?.writeText(String(order.deliveryOtp));
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2500);
    }
  };

  const statusDescriptions = {
    "Pending": "Order placed! Waiting for farmer confirmation.",
    "Accepted": "Order confirmed! Waiting for nearby delivery partner to accept pickup.",
    "Going to Farmer": `Delivery partner ${deliveryBoy?.name || "assigned"} accepted the order and is on the way to the farm.`,
    "Delivery Boy Assigned": `Delivery partner ${deliveryBoy?.name || "assigned"} is navigating to the farm for pickup.`,
    "Reached Farmer": `Delivery partner ${deliveryBoy?.name || "assigned"} has arrived at the farm for harvest handover.`,
    "Picked Up": `Produce picked up from farm. Delivery started by ${deliveryBoy?.name || "rider"}.`,
    "In Transit": `Order is in transit towards your delivery location with ${deliveryBoy?.name || "delivery partner"}.`,
    "Out for Delivery": `Out for delivery! ${deliveryBoy?.name || "Your rider"} will arrive shortly.`,
    "Delivered": "Order delivered successfully and verified with OTP confirmation.",
    "Cancelled": "This order was cancelled.",
    "CANCELLED_BY_BUYER": "This order was cancelled by the buyer.",
  };

  const showOtpBanner = order.deliveryOtp && ["In Transit", "Out for Delivery"].includes(order.status) && currentUser?.accountType === "business";

  return (
    <main className="tracking-page">
      <section className="tracking-shell">
        {/* Navigation Header */}
        <header className="tracking-header">
          <Link className="tracking-back" to={dashboardPath}>
            ← Back to orders
          </Link>
          <div className="tracking-header-right">
            <span className="live-pulse-dot" />
            <span className="live-sync-text">Live GPS Tracker</span>
            <button
              className="tracking-refresh"
              type="button"
              onClick={() => loadTracking(true)}
              disabled={refreshing}
            >
              {refreshing ? "Updating…" : "↻ Refresh"}
            </button>
          </div>
        </header>

        {/* Title and Badge */}
        <div className="tracking-title-row">
          <div>
            <p className="tracking-eyebrow">ORDER #{order.id} {order.trackingCode && `· ${order.trackingCode}`}</p>
            <h1>{statusDescriptions[order.status] || "Order in progress"}</h1>
            <p className="tracking-subtitle">Live GPS location and stage updates refresh in real time.</p>
          </div>
          <span className={`tracking-status status-${order.status.toLowerCase().replace(/\s+/g, "-")}`}>
            {order.status}
          </span>
        </div>

        {/* Swiggy/Amazon 7-Stage Stepper */}
        <section className={`tracking-progress ${deliveryState.cancelled ? "is-cancelled" : ""}`} aria-label="Order progress">
          {deliveryWorkflowSteps.map((step, index) => {
            const complete = !deliveryState.cancelled && index <= deliveryState.activeIndex;
            const current = !deliveryState.cancelled && index === deliveryState.activeIndex;
            return (
              <div className={`tracking-step ${complete ? "is-complete" : ""} ${current ? "is-current" : ""}`} key={step.status}>
                <div className="tracking-step-marker">{complete ? "✓" : step.icon}</div>
                <div>
                  <strong>{step.label}</strong>
                  <span>{current ? "In progress" : complete ? "Completed" : "Next stage"}</span>
                </div>
              </div>
            );
          })}
        </section>

        {deliveryState.cancelled && (
          <div className="tracking-notice tracking-notice-warning">
            ⚠️ This order has been cancelled. If you have any questions, please contact support.
          </div>
        )}

        {/* Buyer OTP Banner (Prominently displayed during In Transit & Out for Delivery) */}
        {showOtpBanner && (
          <section className="delivery-otp-banner" aria-label="Delivery Confirmation OTP">
            <div className="otp-banner-glow" />
            <div className="otp-banner-content">
              <div className="otp-banner-header">
                <span className="otp-shield-badge">🔐 Delivery Confirmation OTP</span>
                <span className="otp-status-pill">Ready for Delivery Handover</span>
              </div>
              <p className="otp-banner-title">
                Share this 4-digit secret OTP with the delivery partner upon arrival to successfully confirm and complete your delivery.
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
                🛡️ <strong>Security Guarantee:</strong> The delivery partner cannot complete the order without entering this code. Only share it after inspecting your produce.
              </p>
            </div>
          </section>
        )}

        {/* Estimated Delivery Time (ETA & Duration) Widget */}
        {order.deliveryEta && !deliveryState.cancelled && order.status !== "Delivered" && (
          <section className="tracking-eta-widget" aria-label="Estimated Delivery Time">
            <div className="eta-widget-left">
              <div className="eta-icon-large">⏱️</div>
              <div className="eta-content-group">
                <span className="eta-badge-tag">ESTIMATED DELIVERY TIME</span>
                <h2 className="eta-duration-title">{order.deliveryEta.estimatedDurationText}</h2>
                <p className="eta-arrival-subtitle">
                  Target Arrival: <strong>{order.deliveryEta.estimatedArrivalTime}</strong> · Total Transit Distance: <strong>{order.deliveryEta.distanceKm}</strong>
                </p>
              </div>
            </div>

            <div className="eta-widget-right">
              <div className="eta-status-pill">
                <span className="eta-pulse-dot" />
                <span>{order.deliveryEta.statusLabel}</span>
              </div>
              <small className="eta-sync-note">⏱️ Live route ETA calculated continuously</small>
            </div>
          </section>
        )}

        {/* Interactive Leaflet Live Map Card */}
        <section className="tracking-map-section">
          <div className="map-card-header">
            <div>
              <h3>🗺️ Live GPS Delivery Route Map</h3>
              <p>Real-time vehicle position between farm pickup and buyer destination.</p>
            </div>
            {latestLocation && (
              <span className="map-updated-tag">
                📍 Last GPS signal: {formatDate(latestLocation.createdAt)}
              </span>
            )}
          </div>
          <div
            ref={mapContainerRef}
            className="leaflet-live-map-container"
            style={{ width: "100%", height: "400px", borderRadius: "12px", border: "1px solid #e2e8f0" }}
          />
        </section>

        {/* Main Grid: Rider Card + Produce Details + Timeline */}
        <div className="tracking-grid">
          {/* Left Column: Timeline & Produce Items */}
          <div className="tracking-main-col">
            {/* Products in this Order */}
            <section className="tracking-panel tracking-items-panel">
              <div className="tracking-panel-heading">
                <h2>🛒 Ordered Fresh Produce ({itemsList.length})</h2>
                <strong style={{ fontSize: "16px", color: "#166534" }}>
                  Total: ₹{Number(order.total).toLocaleString("en-IN")}
                </strong>
              </div>

              <div className="tracking-items-list">
                {itemsList.map((item, idx) => (
                  <div className="tracking-item-card" key={item.id || idx}>
                    <img
                      src={getProductImage(item.productCategory, item.productName)}
                      alt={item.productName || "Produce"}
                      onError={(e) => handleImageError(e, item.productCategory, item.productName)}
                    />
                    <div className="item-info">
                      <strong>{item.productName}</strong>
                      {item.farmerName && <small className="muted-text">Farmer: {item.farmerName}</small>}
                      <span>
                        {item.quantity} {item.productUnit || "kg"} @ ₹{Number(item.unitPrice).toLocaleString("en-IN")}/{item.productUnit || "kg"}
                      </span>
                    </div>
                    <div className="item-price">
                      ₹{Number(item.total).toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Live Timeline History */}
            <section className="tracking-panel tracking-timeline-panel">
              <div className="tracking-panel-heading">
                <div>
                  <p className="tracking-eyebrow">MILESTONE TRACKER</p>
                  <h2>Delivery Journey Timeline</h2>
                </div>
              </div>
              <ol className="tracking-timeline">
                {events.length === 0 ? (
                  <li className="muted-text">No timeline milestones recorded yet.</li>
                ) : (
                  events.map((event) => (
                    <li key={event.id}>
                      <span className="timeline-dot" />
                      <div>
                        <strong>{event.status}</strong>
                        <p>{event.note}</p>
                        <time>{formatDate(event.createdAt)}</time>
                      </div>
                    </li>
                  ))
                )}
              </ol>
            </section>
          </div>

          {/* Right Column: Rider Profile & Destination Info */}
          <aside className="tracking-side">
            {/* Delivery Rider Partner Card */}
            {deliveryBoy ? (
              <section className="tracking-panel rider-info-card">
                <div className="rider-card-header">
                  <div className="rider-avatar-large">
                    {deliveryBoy.name ? deliveryBoy.name.charAt(0).toUpperCase() : "R"}
                  </div>
                  <div>
                    <span className="rider-verified-badge">✓ Verified Partner</span>
                    <h3 className="rider-name">{deliveryBoy.name}</h3>
                    <span className="rider-vehicle-pill">
                      🛵 {deliveryBoy.vehicleType || "Bike"} {deliveryBoy.vehicleNumber ? `(${deliveryBoy.vehicleNumber})` : ""}
                    </span>
                  </div>
                </div>

                <div className="rider-contact-actions">
                  {deliveryBoy.phone ? (
                    <a className="rider-action-btn call" href={`tel:${deliveryBoy.phone}`}>
                      📞 Call Delivery Partner
                    </a>
                  ) : (
                    <span className="muted-text">Phone available upon dispatch</span>
                  )}
                  {deliveryBoy.phone && (
                    <a
                      className="rider-action-btn whatsapp"
                      href={`https://wa.me/${deliveryBoy.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      💬 WhatsApp
                    </a>
                  )}
                </div>

                <div className="rider-delivery-status-box">
                  <span className="status-label">Live Rider Status:</span>
                  <strong>{statusDescriptions[order.status] || deliveryBoy.status || "On Duty"}</strong>
                  {latestLocation?.note && <p className="last-note">{latestLocation.note}</p>}
                </div>
              </section>
            ) : (
              <section className="tracking-panel rider-info-card pending-rider-card">
                <div className="pending-rider-icon">📡</div>
                <h3>Broadcasting to Nearby Riders</h3>
                <p>An online FarmLink delivery partner will accept and navigate to the farm shortly.</p>
              </section>
            )}

            {/* Delivery Destination Box */}
            <section className="tracking-panel tracking-details">
              <p className="tracking-eyebrow">DELIVERY DETAILS</p>
              <h2>Delivering to</h2>
              <strong>{order.deliveryName}</strong>
              <p>{order.deliveryAddress}</p>
              <a className="tracking-phone-link" href={`tel:${order.deliveryPhone}`}>
                📞 {order.deliveryPhone}
              </a>

              <div className="tracking-detail-divider" />

              <span>Payment Details</span>
              <strong>{order.paymentMethod} · {order.paymentStatus}</strong>

              <span>Tracking Code</span>
              <strong>{order.trackingCode || "Will be assigned soon"}</strong>

              <div className="tracking-detail-divider" />

              <span>Farm Origin Location</span>
              <strong>{order.farmLocation || "Gujarat Farmlands"}</strong>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default OrderTracking;
