import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import AdminLayout from "./AdminLayout";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const date = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "-");

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");
      const res = await api("/admin/dashboard");
      setOrders(res.orders || []);
    } catch (err) {
      setError(err.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const activeDeliveries = orders.filter((o) =>
    ["Delivery Boy Assigned", "Picked Up", "In Transit", "Out for Delivery"].includes(o.status)
  );

  const filteredOrders = orders.filter((o) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      String(o.id).includes(q) ||
      o.businessName?.toLowerCase().includes(q) ||
      o.farmerName?.toLowerCase().includes(q) ||
      o.deliveryBoyName?.toLowerCase().includes(q) ||
      o.productName?.toLowerCase().includes(q);

    let matchesStatus = true;
    if (statusFilter === "in-flight") {
      matchesStatus = ["Delivery Boy Assigned", "Picked Up", "In Transit", "Out for Delivery"].includes(o.status);
    } else if (statusFilter === "delivered") {
      matchesStatus = o.status === "Delivered";
    } else if (statusFilter === "pending") {
      matchesStatus = ["Pending", "Accepted", "Awaiting Payment"].includes(o.status);
    } else if (statusFilter === "cancelled") {
      matchesStatus = o.status?.toLowerCase().includes("cancel");
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout activeTab="orders">
      <div className="admin-hero">
        <div>
          <p className="section-tag">LOGISTICS & ORDER MONITOR</p>
          <h1>Platform Transactions & Deliveries ({orders.length})</h1>
          <p>Real-time telemetry, stage progression, payments, and autonomous rider radar tracking.</p>
        </div>
        <button className="admin-refresh" onClick={loadOrders} disabled={loading}>
          {loading ? "Loading..." : "↻ Refresh Orders"}
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {/* In-Flight Live Deliveries Spotlight */}
      <section className="admin-data-section" style={{ borderLeft: "4px solid #0284c7" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div>
            <h2 style={{ margin: 0, color: "#0369a1" }}>
              📍 Live In-Flight Deliveries ({activeDeliveries.length})
            </h2>
            <p className="muted-text" style={{ margin: "4px 0 0 0" }}>
              Active couriers currently transporting fresh produce from farm to commercial buyer.
            </p>
          </div>
          <span className="status-badge-active" style={{ background: "#e0f2fe", color: "#0369a1", borderColor: "#7dd3fc" }}>
            Autonomous Fleet Telemetry
          </span>
        </div>

        {activeDeliveries.length === 0 ? (
          <p className="muted-text">No deliveries currently in-flight.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Current Stage</th>
                  <th>Courier / Rider</th>
                  <th>Farmer</th>
                  <th>Buyer Destination</th>
                  <th>Live Tracking</th>
                </tr>
              </thead>
              <tbody>
                {activeDeliveries.map((order) => (
                  <tr key={`inflight-${order.id}`}>
                    <td>
                      <strong>#{order.id}</strong>
                      <br />
                      <small>{money(order.total)}</small>
                    </td>
                    <td>
                      <span className={`status status-${order.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      🛵 <strong>{order.deliveryBoyName || "Rider Assigned"}</strong>
                      <br />
                      <small style={{ color: "#64748b" }}>{order.deliveryBoyPhone || order.deliveryBoyVehicle || "Active shift"}</small>
                    </td>
                    <td>{order.farmerName}</td>
                    <td>
                      <strong>{order.businessName}</strong>
                      <br />
                      <small>{order.deliveryAddress || "Address on file"}</small>
                    </td>
                    <td>
                      <Link
                        to={`/orders/${order.id}/tracking`}
                        className="farmer-btn"
                        style={{
                          textDecoration: "none",
                          fontSize: "12px",
                          padding: "6px 12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        📡 Live GPS Map →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Complete Order History Book */}
      <section className="admin-data-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ margin: 0 }}>📋 All Platform Orders</h2>
            <p className="muted-text" style={{ margin: "4px 0 0 0" }}>Historical and active transaction registry.</p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {[
              { id: "all", label: "All" },
              { id: "in-flight", label: `In-Flight (${activeDeliveries.length})` },
              { id: "pending", label: "Pending/Accepted" },
              { id: "delivered", label: "Delivered" },
              { id: "cancelled", label: "Cancelled" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`sidebar-nav-item ${statusFilter === tab.id ? "is-active" : ""}`}
                style={{
                  color: statusFilter === tab.id ? "#ffffff" : "#1e293b",
                  background: statusFilter === tab.id ? "#166534" : "#e2e8f0",
                  fontSize: "12px",
                  padding: "5px 12px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "700",
                }}
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}

            <input
              type="text"
              placeholder="Search order #, buyer, farmer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", minWidth: "220px", fontSize: "13px" }}
            />
          </div>
        </div>

        {loading && orders.length === 0 ? (
          <div className="admin-loading">Loading order records...</div>
        ) : filteredOrders.length === 0 ? (
          <p className="muted-text">No orders found matching the filter criteria.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Buyer</th>
                  <th>Farmer</th>
                  <th>Items / Qty</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Assigned Courier</th>
                  <th>Live Radar</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id}>
                    <td><strong>#{o.id}</strong></td>
                    <td>{date(o.createdAt)}</td>
                    <td>
                      <div><strong>{o.businessName}</strong></div>
                      <small style={{ color: "#64748b" }}>{o.businessPhone}</small>
                    </td>
                    <td>{o.farmerName}</td>
                    <td>{o.productName} ({o.quantity} units)</td>
                    <td>
                      <strong>{money(o.total)}</strong>
                      <br />
                      <small style={{ color: o.paymentStatus === "PAID" ? "#16a34a" : "#d97706", fontWeight: "700" }}>
                        {o.paymentMethod} · {o.paymentStatus || "PENDING"}
                      </small>
                    </td>
                    <td>
                      <span className={`status status-${o.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      {o.deliveryBoyName ? (
                        <div>
                          🛵 <strong>{o.deliveryBoyName}</strong>
                          <br />
                          <small style={{ color: "#64748b" }}>{o.deliveryBoyPhone || o.deliveryBoyVehicle}</small>
                        </div>
                      ) : ["Pending", "Accepted"].includes(o.status) ? (
                        <span style={{ fontSize: "11px", color: "#d97706", fontWeight: "700" }}>
                          Broadcasted on Radar
                        </span>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#64748b" }}>-</span>
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/orders/${o.id}/tracking`}
                        style={{
                          textDecoration: "none",
                          fontSize: "12px",
                          fontWeight: "700",
                          color: "#166534",
                          background: "#f0fdf4",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid #bbf7d0",
                          display: "inline-block",
                        }}
                      >
                        Tracking →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}

export default AdminOrders;
