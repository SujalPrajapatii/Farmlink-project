import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const date = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "-");

function AdminDashboard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("farmlinkCurrentUser") || "null");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Dispatch Assignment State
  const [selectedRiders, setSelectedRiders] = useState({});
  const [assigningOrderId, setAssigningOrderId] = useState(null);
  const [assignSuccess, setAssignSuccess] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");
      setData(await api("/admin/dashboard"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser?.accountType === "admin") loadDashboard();
  }, []);

  function handleLogout() {
    localStorage.removeItem("farmlinkToken");
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  async function handleAssignRider(orderId) {
    const riderId = selectedRiders[orderId];
    if (!riderId) {
      alert("Please select a delivery rider first.");
      return;
    }
    try {
      setAssigningOrderId(orderId);
      setAssignSuccess("");
      const res = await api(`/admin/orders/${orderId}/assign-delivery`, {
        method: "POST",
        body: JSON.stringify({ deliveryBoyId: Number(riderId) }),
      });
      setAssignSuccess(res.message || "Rider assigned successfully!");
      await loadDashboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setAssigningOrderId(null);
    }
  }

  async function handleToggleRiderStatus(riderId, currentStatus) {
    const nextStatus = currentStatus === "AVAILABLE" ? "BUSY" : currentStatus === "BUSY" ? "OFFLINE" : "AVAILABLE";
    try {
      await api(`/admin/delivery-boys/${riderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ availabilityStatus: nextStatus }),
      });
      await loadDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  if (!currentUser || currentUser.accountType !== "admin") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Admin access only</h1>
          <p>This dashboard is reserved for FarmLink administrators.</p>
          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const deliveryBoys = data?.deliveryBoys || [];
  const allOrders = data?.orders || [];

  // Orders waiting for dispatch (Pending or Accepted without a rider)
  const unassignedOrders = allOrders.filter(
    (o) => !o.deliveryBoyId && ["Pending", "Accepted"].includes(o.status)
  );

  // Active in-flight deliveries
  const activeDeliveries = allOrders.filter((o) =>
    ["Delivery Boy Assigned", "Picked Up", "In Transit", "Out for Delivery"].includes(o.status)
  );

  return (
    <div className="dashboard-page admin-page">
      <aside className="sidebar">
        <h2>🌱 FarmLink</h2>
        <Link to="/" className="sidebar-nav-item">🏠 Home</Link>
        <Link to="/admin-dashboard" className="sidebar-nav-item is-active">📊 Overview</Link>
        <a href="#dispatch" className="sidebar-nav-item">🚚 Dispatch Hub</a>
        <a href="#fleet" className="sidebar-nav-item">
          🛵 Delivery Fleet {deliveryBoys.length > 0 && <span className="nav-count-badge">{deliveryBoys.length}</span>}
        </a>
        <a href="#farmers" className="sidebar-nav-item">🌾 Farmers</a>
        <a href="#buyers" className="sidebar-nav-item">🛒 Buyers</a>
        <a href="#products" className="sidebar-nav-item">📦 Products</a>
        <a href="#orders" className="sidebar-nav-item">📋 All Orders</a>
        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-content">
        <div className="admin-hero">
          <div>
            <p className="section-tag">ADMIN CONTROL TOWER</p>
            <h1>Platform & Delivery Management</h1>
            <p>Assign orders to delivery riders, monitor active deliveries, and manage marketplace trade.</p>
          </div>
          <button className="admin-refresh" onClick={loadDashboard} disabled={loading}>
            {loading ? "Loading..." : "↻ Refresh Data"}
          </button>
        </div>

        {error && <div className="admin-error">{error}</div>}
        {assignSuccess && <div className="admin-success-box">{assignSuccess}</div>}

        {loading && !data ? (
          <div className="admin-loading">Loading platform data...</div>
        ) : (
          data && (
            <>
              {/* Stat Grid */}
              <section className="admin-stat-grid">
                <Stat label="Total Orders" value={data.summary.orders} />
                <Stat label="Active Deliveries" value={data.summary.activeDeliveries || 0} highlight />
                <Stat label="Available Riders" value={`${data.summary.availableDeliveryBoys || 0} / ${data.summary.deliveryBoys || 0}`} highlight />
                <Stat label="Delivered Sales" value={money(data.summary.deliveredSales)} />
                <Stat label="Farmers" value={data.summary.farmers} />
                <Stat label="Buyers" value={data.summary.businesses} />
                <Stat label="Products" value={data.summary.products} />
              </section>

              {/* 1. DISPATCH CONTROL: UNASSIGNED ORDERS */}
              <section className="admin-data-section" id="dispatch">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div>
                    <h2>🚚 Dispatch Center — Unassigned Confirmed Orders ({unassignedOrders.length})</h2>
                    <p className="muted-text">Assign delivery riders to incoming confirmed farm orders.</p>
                  </div>
                </div>

                {unassignedOrders.length === 0 ? (
                  <div className="admin-empty-box">
                    <span>✓</span> All confirmed orders currently have delivery partners assigned or are delivered.
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Produce</th>
                          <th>Farmer Pickup</th>
                          <th>Buyer Destination</th>
                          <th>Total</th>
                          <th>Select Delivery Rider</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unassignedOrders.map((order) => (
                          <tr key={order.id}>
                            <td>
                              <strong>#{order.id}</strong>
                              <br />
                              <span className={`status status-${order.status.toLowerCase().replace(/\s+/g, "-")}`}>
                                {order.status}
                              </span>
                            </td>
                            <td>
                              <strong>{order.productName}</strong>
                              <br />
                              <small>{order.quantity} units</small>
                            </td>
                            <td>
                              🧑‍🌾 <strong>{order.farmerName}</strong>
                            </td>
                            <td>
                              🛒 <strong>{order.businessName}</strong>
                              <br />
                              <small>{order.deliveryAddress || "Address on file"}</small>
                            </td>
                            <td>
                              <strong>{money(order.total)}</strong>
                              <br />
                              <small>{order.paymentMethod}</small>
                            </td>
                            <td>
                              <select
                                className="admin-rider-select"
                                value={selectedRiders[order.id] || ""}
                                onChange={(e) =>
                                  setSelectedRiders({ ...selectedRiders, [order.id]: e.target.value })
                                }
                              >
                                <option value="">-- Choose Rider --</option>
                                {deliveryBoys.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name} ({r.vehicleType || "Bike"} - {r.availabilityStatus}) [{r.activeDeliveriesCount} active]
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="admin-assign-btn"
                                disabled={assigningOrderId === order.id}
                                onClick={() => handleAssignRider(order.id)}
                              >
                                {assigningOrderId === order.id ? "Assigning…" : "🚀 Assign Rider"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* 2. ACTIVE DELIVERIES MONITOR */}
              <section className="admin-data-section">
                <h2>📍 In-Flight Deliveries Monitor ({activeDeliveries.length})</h2>
                <p className="muted-text">Track deliveries moving from farm to buyer in real-time.</p>

                {activeDeliveries.length === 0 ? (
                  <p className="muted-text">No active deliveries in progress right now.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Stage</th>
                          <th>Assigned Rider</th>
                          <th>Farmer</th>
                          <th>Buyer</th>
                          <th>Reassign Rider</th>
                          <th>Live Map</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeDeliveries.map((order) => (
                          <tr key={order.id}>
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
                              🛵 <strong>{order.deliveryBoyName || "Rider"}</strong>
                              <br />
                              <small>{order.deliveryBoyPhone || "No phone"}</small>
                            </td>
                            <td>{order.farmerName}</td>
                            <td>{order.businessName}</td>
                            <td>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <select
                                  className="admin-rider-select"
                                  style={{ maxWidth: "160px" }}
                                  value={selectedRiders[order.id] || ""}
                                  onChange={(e) =>
                                    setSelectedRiders({ ...selectedRiders, [order.id]: e.target.value })
                                  }
                                >
                                  <option value="">Reassign…</option>
                                  {deliveryBoys.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name} ({r.availabilityStatus})
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="admin-reassign-btn"
                                  disabled={assigningOrderId === order.id}
                                  onClick={() => handleAssignRider(order.id)}
                                >
                                  Reassign
                                </button>
                              </div>
                            </td>
                            <td>
                              <Link className="btn-table-track" to={`/orders/${order.id}/tracking`}>
                                Live Map ↗
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* 3. REGISTERED DELIVERY FLEET */}
              <section className="admin-data-section" id="fleet">
                <h2>🛵 Registered Delivery Partners ({deliveryBoys.length})</h2>
                {deliveryBoys.length === 0 ? (
                  <p className="muted-text">No delivery riders registered yet.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Rider Name</th>
                          <th>Phone</th>
                          <th>Vehicle Info</th>
                          <th>Shift Status</th>
                          <th>Active Drops</th>
                          <th>Delivered</th>
                          <th>Joined</th>
                          <th>Toggle Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryBoys.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <strong>{r.name}</strong>
                              <br />
                              <small className="muted-text">{r.email}</small>
                            </td>
                            <td>{r.phone || "-"}</td>
                            <td>
                              <strong>{r.vehicleType || "Bike"}</strong>
                              {r.vehicleNumber && <small> ({r.vehicleNumber})</small>}
                            </td>
                            <td>
                              <span
                                className={`availability-pill ${
                                  r.availabilityStatus === "AVAILABLE"
                                    ? "avail-green"
                                    : r.availabilityStatus === "BUSY"
                                    ? "avail-yellow"
                                    : "avail-grey"
                                }`}
                              >
                                {r.availabilityStatus}
                              </span>
                            </td>
                            <td>
                              <strong>{r.activeDeliveriesCount}</strong>
                            </td>
                            <td>{r.completedDeliveriesCount}</td>
                            <td>{date(r.createdAt)}</td>
                            <td>
                              <button
                                type="button"
                                className="admin-status-toggle-btn"
                                onClick={() => handleToggleRiderStatus(r.id, r.availabilityStatus)}
                              >
                                Toggle
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Standard Platform Tables */}
              <DataTable
                id="farmers"
                title="Registered Farmers"
                columns={["Name", "Email", "Phone", "Products", "Orders", "Joined"]}
                rows={data.farmers.map((farmer) => [
                  farmer.name,
                  farmer.email,
                  farmer.phone || "-",
                  farmer.productCount,
                  farmer.orderCount,
                  date(farmer.createdAt),
                ])}
              />

              <DataTable
                id="buyers"
                title="Registered Buyers"
                columns={["Name", "Email", "Phone", "Orders", "Order Value", "Joined"]}
                rows={data.businesses.map((buyer) => [
                  buyer.name,
                  buyer.email,
                  buyer.phone || "-",
                  buyer.orderCount,
                  money(buyer.orderValue),
                  date(buyer.createdAt),
                ])}
              />

              <DataTable
                id="products"
                title="All Product Listings"
                columns={["Product", "Category", "Farmer", "Stock", "Price", "Location"]}
                rows={data.products.map((product) => [
                  product.name,
                  product.category,
                  product.farmerName,
                  `${product.quantity} ${product.unit}`,
                  money(product.price),
                  product.location,
                ])}
              />

              <DataTable
                id="orders"
                title="All Orders History"
                columns={["Order", "Product", "Buyer", "Farmer", "Rider", "Total", "Status", "Date"]}
                rows={data.orders.map((order) => [
                  `#${order.id}`,
                  order.productName,
                  order.businessName,
                  order.farmerName,
                  order.deliveryBoyName ? `🛵 ${order.deliveryBoyName}` : "-",
                  money(order.total),
                  <span className={`status status-${order.status.toLowerCase().replace(/\s+/g, "-")}`}>
                    {order.status}
                  </span>,
                  date(order.createdAt),
                ])}
              />
            </>
          )
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <article className={`admin-stat-card ${highlight ? "highlight-stat" : ""}`}>
      <p>{label}</p>
      <h2>{value}</h2>
    </article>
  );
}

function DataTable({ id, title, columns, rows }) {
  return (
    <section className="admin-data-section" id={id}>
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="muted-text">No records yet.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AdminDashboard;
