import { useEffect, useState } from "react";
import { api } from "../../api";
import AdminLayout from "./AdminLayout";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const date = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "-");

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");
      const res = await api("/admin/dashboard");
      setProducts(res.products || []);
    } catch (err) {
      setError(err.message || "Failed to load marketplace products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = ["all", ...new Set(products.map((p) => p.category).filter(Boolean))];

  const filteredProducts = products.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      p.name?.toLowerCase().includes(q) ||
      p.farmerName?.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <AdminLayout activeTab="products">
      <div className="admin-hero">
        <div>
          <p className="section-tag">MARKETPLACE CATALOG</p>
          <h1>Listed Produce & Crops ({products.length})</h1>
          <p>Inspect farmer listings, monitor live stock levels, unit prices, and harvest locations.</p>
        </div>
        <button className="admin-refresh" onClick={loadProducts} disabled={loading}>
          {loading ? "Loading..." : "↻ Refresh Catalog"}
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`sidebar-nav-item ${categoryFilter === c ? "is-active" : ""}`}
              style={{
                color: categoryFilter === c ? "#ffffff" : "#1e293b",
                background: categoryFilter === c ? "#166534" : "#e2e8f0",
                fontSize: "12px",
                padding: "5px 12px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: "700",
              }}
              onClick={() => setCategoryFilter(c)}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search crop, farmer, or region..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", minWidth: "260px", fontSize: "13px" }}
        />
      </div>

      <section className="admin-data-section">
        {loading && products.length === 0 ? (
          <div className="admin-loading">Loading marketplace products...</div>
        ) : filteredProducts.length === 0 ? (
          <p className="muted-text">No products found matching your search.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Produce</th>
                  <th>Category</th>
                  <th>Available Stock</th>
                  <th>Unit Price</th>
                  <th>Location</th>
                  <th>Farmer</th>
                  <th>Listed Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td><strong>#{p.id}</strong></td>
                    <td>
                      📦 <strong>{p.name}</strong>
                    </td>
                    <td>
                      <span className="status" style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #86efac" }}>
                        {p.category}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: p.quantity < 20 ? "#dc2626" : "#0f172a" }}>
                        {p.quantity} {p.unit}
                      </strong>
                      {p.quantity === 0 && <small style={{ display: "block", color: "#dc2626" }}>Out of stock</small>}
                    </td>
                    <td>
                      <strong>{money(p.price)}</strong> / {p.unit}
                    </td>
                    <td>{p.location || "Local farm"}</td>
                    <td>
                      <div>{p.farmerName}</div>
                      <small style={{ color: "#64748b" }}>{p.farmerEmail}</small>
                    </td>
                    <td>{date(p.createdAt)}</td>
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

export default AdminProducts;
