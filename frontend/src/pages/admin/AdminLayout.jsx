import { Link, NavLink, useNavigate } from "react-router-dom";

function AdminLayout({ children, activeTab }) {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("farmlinkCurrentUser") || "null");

  function handleLogout() {
    localStorage.removeItem("farmlinkToken");
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/login");
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

  const navItems = [
    { label: "📊 Overview", path: "/admin-dashboard", key: "overview" },
    { label: "🌾 Farmers", path: "/admin/farmers", key: "farmers" },
    { label: "🛒 Buyers", path: "/admin/buyers", key: "buyers" },
    { label: "🛵 Delivery Fleet", path: "/admin/riders", key: "riders" },
    { label: "📦 Products", path: "/admin/products", key: "products" },
    { label: "📋 Orders", path: "/admin/orders", key: "orders" },
  ];

  return (
    <div className="dashboard-page admin-page">
      <aside className="sidebar">
        <h2>🌱 FarmLink Admin</h2>
        <Link to="/" className="sidebar-nav-item">🏠 Home</Link>
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <NavLink
              key={item.key}
              to={item.path}
              className={`sidebar-nav-item ${isActive ? "is-active" : ""}`}
            >
              {item.label}
            </NavLink>
          );
        })}
        <button className="sidebar-logout" onClick={handleLogout} title="Sign out of Admin Portal">
          Logout
        </button>
      </aside>

      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
