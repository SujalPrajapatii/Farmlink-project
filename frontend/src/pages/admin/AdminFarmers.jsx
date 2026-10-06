import { useEffect, useState } from "react";
import { api } from "../../api";
import AdminLayout from "./AdminLayout";
import AdminUserRemovalModal from "./AdminUserRemovalModal";

const date = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "-");

function AdminFarmers() {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [userToRemove, setUserToRemove] = useState(null);

  async function loadFarmers() {
    try {
      setLoading(true);
      setError("");
      const res = await api("/admin/dashboard");
      setFarmers(res.farmers || []);
    } catch (err) {
      setError(err.message || "Failed to load farmers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFarmers();
  }, []);

  const filteredFarmers = farmers.filter((f) => {
    const q = searchTerm.toLowerCase();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.email?.toLowerCase().includes(q) ||
      f.phone?.includes(q)
    );
  });

  const activeCount = farmers.filter((f) => !f.isDeleted).length;
  const removedCount = farmers.filter((f) => f.isDeleted).length;

  return (
    <AdminLayout activeTab="farmers">
      <div className="admin-hero">
        <div>
          <p className="section-tag">FARMER MANAGEMENT DIRECTORY</p>
          <h1>Registered Agricultural Producers ({farmers.length})</h1>
          <p>Verify grower profiles, inspect product listings, and manage account removals.</p>
        </div>
        <button className="admin-refresh" onClick={loadFarmers} disabled={loading}>
          {loading ? "Loading..." : "↻ Refresh Farmers"}
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className="status-badge-active">Active Farmers: {activeCount}</span>
          {removedCount > 0 && <span className="status-badge-removed">Removed: {removedCount}</span>}
        </div>
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", minWidth: "260px", fontSize: "13px" }}
        />
      </div>

      <section className="admin-data-section">
        {loading && farmers.length === 0 ? (
          <div className="admin-loading">Loading farmer profiles...</div>
        ) : filteredFarmers.length === 0 ? (
          <p className="muted-text">No farmers found matching your criteria.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Farmer Details</th>
                  <th>Contact</th>
                  <th>Listed Products</th>
                  <th>Orders Fulfilled</th>
                  <th>Joined Date</th>
                  <th>Account Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFarmers.map((f) => (
                  <tr key={f.id} style={f.isDeleted ? { background: "#fff5f5" } : {}}>
                    <td><strong>#{f.id}</strong></td>
                    <td>
                      🌾 <strong>{f.name}</strong>
                    </td>
                    <td>
                      <div>{f.email}</div>
                      <small style={{ color: "#64748b" }}>{f.phone || "No phone"}</small>
                    </td>
                    <td>
                      <strong>{f.productCount || 0}</strong> products
                    </td>
                    <td>
                      <strong>{f.orderCount || 0}</strong> orders
                    </td>
                    <td>{date(f.createdAt)}</td>
                    <td>
                      {f.isDeleted ? (
                        <div>
                          <span className="status-badge-removed">Removed</span>
                          {f.removalReason && (
                            <span className="removal-reason-tag" title={f.removalReason}>
                              Reason: {f.removalReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="status-badge-active">Active</span>
                      )}
                    </td>
                    <td>
                      {f.isDeleted ? (
                        <span style={{ fontSize: "12px", color: "#991b1b", fontStyle: "italic" }}>
                          Removed {date(f.removedAt)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn-remove-user"
                          onClick={() => setUserToRemove({ id: f.id, name: f.name, role: "Farmer" })}
                        >
                          Remove Farmer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {userToRemove && (
        <AdminUserRemovalModal
          user={userToRemove}
          onClose={() => setUserToRemove(null)}
          onSuccess={loadFarmers}
        />
      )}
    </AdminLayout>
  );
}

export default AdminFarmers;
