import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "-";

function AdminDashboard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("farmlinkCurrentUser") || "null");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { if (currentUser?.accountType === "admin") loadDashboard(); }, []);

  function handleLogout() {
    localStorage.removeItem("farmlinkToken");
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  if (!currentUser || currentUser.accountType !== "admin") {
    return <div className="auth-page"><div className="auth-card"><h1>Admin access only</h1><p>This dashboard is reserved for FarmLink administrators.</p><Link className="farmer-btn" to="/login">Go to Login</Link></div></div>;
  }

  return <div className="dashboard-page admin-page">
    <aside className="sidebar"><h2>FarmLink</h2><Link to="/admin-dashboard">Overview</Link><a href="#farmers">Farmers</a><a href="#buyers">Buyers</a><a href="#products">Products</a><a href="#orders">Orders</a><button className="sidebar-logout" onClick={handleLogout}>Logout</button></aside>
    <main className="dashboard-content">
      <div className="admin-hero"><div><p className="section-tag">ADMIN DASHBOARD</p><h1>Platform overview</h1><p>Monitor farmers, buyers, products, orders, and sales from one place.</p></div><button className="admin-refresh" onClick={loadDashboard} disabled={loading}>{loading ? "Loading..." : "Refresh data"}</button></div>
      {error && <div className="admin-error">{error}</div>}
      {loading && !data ? <div className="admin-loading">Loading dashboard data...</div> : data && <>
        <section className="admin-stat-grid"><Stat label="Farmers" value={data.summary.farmers} /><Stat label="Buyers" value={data.summary.businesses} /><Stat label="Products" value={data.summary.products} /><Stat label="Orders" value={data.summary.orders} /><Stat label="Delivered sales" value={money(data.summary.deliveredSales)} /></section>
        <DataTable id="farmers" title="Registered farmers" columns={["Name", "Email", "Products", "Orders", "Joined"]} rows={data.farmers.map((farmer) => [farmer.name, farmer.email, farmer.productCount, farmer.orderCount, date(farmer.createdAt)])} />
        <DataTable id="buyers" title="Registered buyers" columns={["Name", "Email", "Orders", "Order value", "Joined"]} rows={data.businesses.map((buyer) => [buyer.name, buyer.email, buyer.orderCount, money(buyer.orderValue), date(buyer.createdAt)])} />
        <DataTable id="products" title="All product listings" columns={["Product", "Category", "Farmer", "Stock", "Price", "Location"]} rows={data.products.map((product) => [product.name, product.category, product.farmerName, `${product.quantity} ${product.unit}`, money(product.price), product.location])} />
        <DataTable id="orders" title="All orders" columns={["Order", "Product", "Buyer", "Farmer", "Total", "Status", "Payment", "Date"]} rows={data.orders.map((order) => [`#${order.id}`, order.productName, order.businessName, order.farmerName, money(order.total), <span className={`status status-${order.status.toLowerCase().replaceAll(" ", "-")}`}>{order.status}</span>, `${order.paymentMethod} / ${order.paymentStatus}`, date(order.createdAt)])} />
      </>}
    </main>
  </div>;
}

function Stat({ label, value }) { return <article className="admin-stat-card"><p>{label}</p><h2>{value}</h2></article>; }
function DataTable({ id, title, columns, rows }) { return <section className="admin-data-section" id={id}><h2>{title}</h2>{rows.length === 0 ? <p className="muted-text">No records yet.</p> : <div className="table-wrapper"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>}</section>; }
export default AdminDashboard;
