import { useState } from "react";
import { api } from "../../api";

const PRESET_REASONS = [
  "Violation of platform terms and conditions",
  "Suspected fraudulent activity or fake orders",
  "Repeated product quality or delivery complaints",
  "Inactive account / inactivity policy",
  "Breach of code of conduct / inappropriate behavior",
  "Requested account closure by user",
  "Other (custom reason specified below)",
];

function AdminUserRemovalModal({ user, onClose, onSuccess }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  async function handleConfirm(e) {
    e.preventDefault();
    const finalReason =
      selectedPreset.startsWith("Other") && customReason.trim()
        ? customReason.trim()
        : customReason.trim()
        ? `${selectedPreset}: ${customReason.trim()}`
        : selectedPreset;

    if (!finalReason) {
      setError("Please specify a reason for removing this user.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api(`/admin/users/${user.id}/remove`, {
        method: "POST",
        body: JSON.stringify({ reason: finalReason }),
      });
      alert(res.message || "User removed successfully.");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to remove user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚠️ Remove User</h3>
          <p>
            You are about to remove <strong>{user.name}</strong> ({user.role || user.accountType || "User"}).
          </p>
        </div>

        {error && <div className="admin-error" style={{ margin: "12px 0", padding: "10px" }}>{error}</div>}

        <form onSubmit={handleConfirm}>
          <div className="modal-body">
            <label>Select Primary Reason:</label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              disabled={loading}
            >
              {PRESET_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <label>Detailed Notes / Additional Context (Required for specific audits):</label>
            <textarea
              rows="3"
              placeholder="Provide specific justification (e.g. Repeated delivery failures, fake listing report ID, etc.)..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              disabled={loading}
              required={selectedPreset.startsWith("Other")}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="modal-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn-danger"
              disabled={loading}
            >
              {loading ? "Removing…" : "Confirm Removal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminUserRemovalModal;
