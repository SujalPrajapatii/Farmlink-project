import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import AdminLayout from "./AdminLayout";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const date = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "-");

function AdminOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const res = await api("/admin/dashboard");
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load dashboard overview.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const summary = data?.summary || {};
  const recentOrders = (data?.orders || []).slice(0, 6);
  const activeDeliveries = (data?.orders || []).filter((o) =>
    ["Delivery Boy Assigned", "Picked Up", "In Transit", "Out for Delivery"].includes(o.status)
  );

  return (
    <AdminLayout activeTab="overview">
      <div className="admin-hero">
        <div>
          <p className="section-tag">ADMIN EXECUTIVE TOWER</p>
          <h1>Platform Operations Overview</h1>
          <p>Real-time analytics, marketplace volume, and quick dispatch telemetry.</p>
        </div>
        <button className="admin-refresh" onClick={loadData} disabled={loading}>
          {loading ? "Loading..." : "↻ Refresh Data"}
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {loading && !data ? (
        <div className="admin-loading">Loading platform statistics...</div>
      ) : (
        <>
          {/* Executive Stat Cards */}
          <div className="admin-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div className="admin-stat-card">
              <p>DELIVERED GMV</p>
              <h2>{money(summary.deliveredSales)}</h2>
              <small style={{ color: "#16a34a", fontWeight: "700" }}>✓ Settled volume</small>
            </div>
            <div className="admin-stat-card">
              <p>IN-FLIGHT DELIVERIES</p>
              <h2>{activeDeliveries.length}</h2>
              <small style={{ color: "#0284c7", fontWeight: "700" }}>Live on road</small>
            </div>
            <div className="admin-stat-card">
              <p>TOTAL ORDERS</p>
              <h2>{summary.orders || 0}</h2>
              <small style={{ color: "#64748b" }}>Lifetime transactions</small>
            </div>
            <div className="admin-stat-card">
              <p>REGISTERED FARMERS</p>
              <h2>{summary.farmers || 0}</h2>
              <small style={{ color: "#166534" }}>Active producers</small>
            </div>
            <div className="admin-stat-card">
              <p>REGISTERED BUYERS</p>
              <h2>{summary.businesses || 0}</h2>
              <small style={{ color: "#d97706" }}>Commercial accounts</small>
            </div>
            <div className="admin-stat-card">
              <p>DELIVERY FLEET</p>
              <h2>{summary.deliveryBoys || 0}</h2>
              <small style={{ color: "#2563eb" }}>{summary.availableDeliveryBoys || 0} currently online</small>
            </div>
          </div>

          {/* Quick Action Navigation Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginTop: "24px" }}>
            <Link to="/admin/farmers" style={{ textDecoration: "none" }}>
              <div className="admin-stat-card" style={{ cursor: "pointer", borderLeft: "4px solid #16a34a" }}>
                <h3 style={{ margin: "0 0 6px 0", color: "#166534", fontSize: "17px" }}>🌾 Manage Farmers →</h3>
                <p style={{ margin: 0, color: "#475569", fontSize: "13px" }}>
                  View growers, check product listings, and manage account approvals or removals.
                </p>
              </div>
            </Link>

            <Link to="/admin/buyers" style={{ textDecoration: "none" }}>
              <div className="admin-stat-card" style={{ cursor: "pointer", borderLeft: "4px solid #f59e0b" }}>
                <h3 style={{ margin: "0 0 6px 0", color: "#b45309", fontSize: "17px" }}>🛒 Manage Buyers →</h3>
                <p style={{ margin: 0, color: "#475569", fontSize: "13px" }}>
                  View business buyers, order history, spend volume, and manage accounts.
                </p>
              </div>
            </Link>

            <Link to="/admin/riders" style={{ textDecoration: "none" }}>
              <div className="admin-stat-card" style={{ cursor: "pointer", borderLeft: "4px solid #3b82f6" }}>
                <h3 style={{ margin: "0 0 6px 0", color: "#1d4ed8", fontSize: "17px" }}>🛵 Delivery Fleet →</h3>
                <p style={{ margin: 0, color: "#475569", fontSize: "13px" }}>
                  Monitor riders, verify vehicles, check online shifts, and view delivery history.
                </p>
              </div>
            </Link>

            <Link to="/admin/orders" style={{ textDecoration: "none" }}>
              <div className="admin-stat-card" style={{ cursor: "pointer", borderLeft: "4px solid #8b5cf6" }}>
                <h3 style={{ margin: "0 0 6px 0", color: "#6d28d9", fontSize: "17px" }}>📋 Platform Orders →</h3>
                <p style={{ margin: 0, color: "#475569", fontSize: "13px" }}>
                  Inspect all buyer orders, live delivery radar tracking, and payment statuses.
                </p>
              </div>
            </Link>
          </div>

          {/* Recent Orders Overview */}
          <section className="admin-data-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0 }}>📋 Recent Transactions</h2>
                <p className="muted-text" style={{ margin: "4px 0 0 0" }}>Latest order activity across the marketplace.</p>
              </div>
              <Link to="/admin/orders" className="register-btn" style={{ textDecoration: "none", fontSize: "13px", padding: "8px 16px" }}>
                View All Orders →
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="muted-text">No orders recorded yet.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Buyer</th>
                      <th>Farmer</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td><strong>#{o.id}</strong></td>
                        <td>{date(o.createdAt)}</td>
                        <td>{o.businessName}</td>
                        <td>{o.farmerName}</td>
                        <td>{o.productName} ({o.quantity} units)</td>
                        <td><strong>{money(o.total)}</strong></td>
                        <td>
                          <span className={`status status-${o.status.toLowerCase().replace(/\s+/g, "-")}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </AdminLayout>
  );
}

export default AdminOverview;
