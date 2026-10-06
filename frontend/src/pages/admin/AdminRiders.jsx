import { useEffect, useState } from "react";
import { api } from "../../api";
import AdminLayout from "./AdminLayout";
import AdminUserRemovalModal from "./AdminUserRemovalModal";

const date = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "-");

function AdminRiders() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [userToRemove, setUserToRemove] = useState(null);

  async function loadRiders() {
    try {
      setLoading(true);
      setError("");
      const res = await api("/admin/dashboard");
      setRiders(res.deliveryBoys || []);
    } catch (err) {
      setError(err.message || "Failed to load delivery fleet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRiders();
  }, []);

  async function handleToggleStatus(riderId, currentStatus) {
    const nextStatus = currentStatus === "AVAILABLE" ? "BUSY" : currentStatus === "BUSY" ? "OFFLINE" : "AVAILABLE";
    try {
      await api(`/admin/delivery-boys/${riderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ availabilityStatus: nextStatus }),
      });
      await loadRiders();
    } catch (err) {
      alert(err.message || "Could not update rider status.");
    }
  }

  const filteredRiders = riders.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.phone?.includes(q) ||
      r.vehicleNumber?.toLowerCase().includes(q)
    );
  });

  const activeCount = riders.filter((r) => !r.isDeleted).length;
  const removedCount = riders.filter((r) => r.isDeleted).length;
  const onlineCount = riders.filter((r) => !r.isDeleted && r.availabilityStatus === "AVAILABLE").length;

  return (
    <AdminLayout activeTab="riders">
      <div className="admin-hero">
        <div>
          <p className="section-tag">FLEET DISPATCH OVERSIGHT</p>
          <h1>Delivery Partners & Riders ({riders.length})</h1>
          <p>Monitor courier shifts, verify vehicles, check active delivery runs, and manage fleet roster.</p>
        </div>
        <button className="admin-refresh" onClick={loadRiders} disabled={loading}>
          {loading ? "Loading..." : "↻ Refresh Fleet"}
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className="status-badge-active">Online Riders: {onlineCount}</span>
          <span className="status-badge-active" style={{ background: "#e0f2fe", color: "#0369a1", borderColor: "#7dd3fc" }}>
            Total Active Fleet: {activeCount}
          </span>
          {removedCount > 0 && <span className="status-badge-removed">Removed: {removedCount}</span>}
        </div>
        <input
          type="text"
          placeholder="Search rider, phone, vehicle plate..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", minWidth: "260px", fontSize: "13px" }}
        />
      </div>

      <section className="admin-data-section">
        {loading && riders.length === 0 ? (
          <div className="admin-loading">Loading delivery partner fleet...</div>
        ) : filteredRiders.length === 0 ? (
          <p className="muted-text">No delivery riders found matching your criteria.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Rider Name</th>
                  <th>Contact</th>
                  <th>Vehicle Details</th>
                  <th>Shift Availability</th>
                  <th>Active Runs</th>
                  <th>Delivered</th>
                  <th>Account Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRiders.map((r) => (
                  <tr key={r.id} style={r.isDeleted ? { background: "#fff5f5" } : {}}>
                    <td><strong>#{r.id}</strong></td>
                    <td>
                      🛵 <strong>{r.name}</strong>
                    </td>
                    <td>
                      <div>{r.email}</div>
                      <small style={{ color: "#64748b" }}>{r.phone || "No phone"}</small>
                    </td>
                    <td>
                      <div>{r.vehicleType || "Bike"}</div>
                      <small style={{ color: "#64748b", fontWeight: "700" }}>{r.vehicleNumber || "No plate"}</small>
                    </td>
                    <td>
                      <span className={`status status-${r.availabilityStatus.toLowerCase()}`}>
                        {r.availabilityStatus}
                      </span>
                      {!r.isDeleted && (
                        <button
                          type="button"
                          className="admin-status-toggle-btn"
                          style={{ marginLeft: "8px", fontSize: "11px", padding: "3px 8px" }}
                          onClick={() => handleToggleStatus(r.id, r.availabilityStatus)}
                          title="Cycle shift status"
                        >
                          Change
                        </button>
                      )}
                    </td>
                    <td>
                      <strong>{r.activeDeliveriesCount || 0}</strong> active
                    </td>
                    <td>
                      <strong>{r.completedDeliveriesCount || 0}</strong> completed
                    </td>
                    <td>
                      {r.isDeleted ? (
                        <div>
                          <span className="status-badge-removed">Removed</span>
                          {r.removalReason && (
                            <span className="removal-reason-tag" title={r.removalReason}>
                              Reason: {r.removalReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="status-badge-active">Active</span>
                      )}
                    </td>
                    <td>
                      {r.isDeleted ? (
                        <span style={{ fontSize: "12px", color: "#991b1b", fontStyle: "italic" }}>
                          Removed {date(r.removedAt)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn-remove-user"
                          onClick={() => setUserToRemove({ id: r.id, name: r.name, role: "Delivery Rider" })}
                        >
                          Remove Rider
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
          onSuccess={loadRiders}
        />
      )}
    </AdminLayout>
  );
}

export default AdminRiders;
