import { useEffect, useState } from "react";
import { api } from "../../api";
import AdminLayout from "./AdminLayout";
import AdminUserRemovalModal from "./AdminUserRemovalModal";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const date = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "-");

function AdminBuyers() {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [userToRemove, setUserToRemove] = useState(null);

  async function loadBuyers() {
    try {
      setLoading(true);
      setError("");
      const res = await api("/admin/dashboard");
      setBuyers(res.businesses || []);
    } catch (err) {
      setError(err.message || "Failed to load buyers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBuyers();
  }, []);

  const filteredBuyers = buyers.filter((b) => {
    const q = searchTerm.toLowerCase();
    return (
      b.name?.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q) ||
      b.phone?.includes(q)
    );
  });

  const activeCount = buyers.filter((b) => !b.isDeleted).length;
  const removedCount = buyers.filter((b) => b.isDeleted).length;

  return (
    <AdminLayout activeTab="buyers">
      <div className="admin-hero">
        <div>
          <p className="section-tag">BUYER MANAGEMENT DIRECTORY</p>
          <h1>Registered Business Buyers ({buyers.length})</h1>
          <p>Inspect commercial buyer accounts, total spend volume, and manage account removals.</p>
        </div>
        <button className="admin-refresh" onClick={loadBuyers} disabled={loading}>
          {loading ? "Loading..." : "↻ Refresh Buyers"}
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className="status-badge-active">Active Buyers: {activeCount}</span>
          {removedCount > 0 && <span className="status-badge-removed">Removed: {removedCount}</span>}
        </div>
        <input
          type="text"
          placeholder="Search by business name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", minWidth: "260px", fontSize: "13px" }}
        />
      </div>

      <section className="admin-data-section">
        {loading && buyers.length === 0 ? (
          <div className="admin-loading">Loading buyer accounts...</div>
        ) : filteredBuyers.length === 0 ? (
          <p className="muted-text">No buyers found matching your criteria.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Business Details</th>
                  <th>Contact Info</th>
                  <th>Orders Placed</th>
                  <th>Total Spend</th>
                  <th>Joined Date</th>
                  <th>Account Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuyers.map((b) => (
                  <tr key={b.id} style={b.isDeleted ? { background: "#fff5f5" } : {}}>
                    <td><strong>#{b.id}</strong></td>
                    <td>
                      🛒 <strong>{b.name}</strong>
                    </td>
                    <td>
                      <div>{b.email}</div>
                      <small style={{ color: "#64748b" }}>{b.phone || "No phone"}</small>
                    </td>
                    <td>
                      <strong>{b.orderCount || 0}</strong> orders
                    </td>
                    <td>
                      <strong>{money(b.orderValue)}</strong>
                    </td>
                    <td>{date(b.createdAt)}</td>
                    <td>
                      {b.isDeleted ? (
                        <div>
                          <span className="status-badge-removed">Removed</span>
                          {b.removalReason && (
                            <span className="removal-reason-tag" title={b.removalReason}>
                              Reason: {b.removalReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="status-badge-active">Active</span>
                      )}
                    </td>
                    <td>
                      {b.isDeleted ? (
                        <span style={{ fontSize: "12px", color: "#991b1b", fontStyle: "italic" }}>
                          Removed {date(b.removedAt)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn-remove-user"
                          onClick={() => setUserToRemove({ id: b.id, name: b.name, role: "Buyer" })}
                        >
                          Remove Buyer
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
          onSuccess={loadBuyers}
        />
      )}
    </AdminLayout>
  );
}

export default AdminBuyers;
