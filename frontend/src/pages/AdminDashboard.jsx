import { Link, useNavigate } from "react-router-dom";

function AdminDashboard() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const users = JSON.parse(localStorage.getItem("farmlinkUsers") || "[]");
  const products = JSON.parse(
    localStorage.getItem("farmlinkProducts") || "[]"
  );
  const orders = JSON.parse(localStorage.getItem("farmlinkOrders") || "[]");

  const farmers = users.filter((user) => user.accountType === "farmer");
  const businesses = users.filter((user) => user.accountType === "business");

  function handleLogout() {
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  if (!currentUser || currentUser.accountType !== "admin") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Admin access only</h1>
          <p>This dashboard is reserved for FarmLink administrators.</p>
          <Link className="farmer-btn" to="/">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <h2>🌱 FarmLink</h2>
        <Link to="/admin-dashboard">Dashboard</Link>
        <a href="#users">Users</a>
        <a href="#products">Products</a>
        <a href="#orders">Orders</a>
        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <p className="section-tag">ADMIN DASHBOARD</p>
            <h1>Platform Overview</h1>
            <p>Monitor FarmLink users, crop listings, and orders.</p>
          </div>
        </div>

        <section className="dashboard-stats">
          <div className="dashboard-stat-card">
            <p>Total Farmers</p>
            <h2>{farmers.length}</h2>
          </div>
          <div className="dashboard-stat-card">
            <p>Total Businesses</p>
            <h2>{businesses.length}</h2>
          </div>
          <div className="dashboard-stat-card">
            <p>Total Products</p>
            <h2>{products.length}</h2>
          </div>
          <div className="dashboard-stat-card">
            <p>Total Orders</p>
            <h2>{orders.length}</h2>
          </div>
        </section>

        <section className="product-section" id="users">
          <h2>Registered Users</h2>

          {users.length === 0 ? (
            <p className="muted-text">No registered users yet.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Account Type</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.accountType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="product-section" id="orders">
          <h2>All Orders</h2>

          {orders.length === 0 ? (
            <p className="muted-text">No orders have been placed yet.</p>
          ) : (
            <div className="order-list">
              {orders.map((order) => (
                <div className="order-card" key={order.id}>
                  <div>
                    <h3>{order.productName}</h3>
                    <p>
                      {order.businessName} ordered {order.quantity} unit(s)
                    </p>
                  </div>
                  <strong>₹{order.total}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;