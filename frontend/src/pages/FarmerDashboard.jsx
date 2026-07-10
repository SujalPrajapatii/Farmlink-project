import { Link } from "react-router-dom";

function FarmerDashboard() {
  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <h2>🌱 FarmLink</h2>
        <Link to="/farmer-dashboard">Dashboard</Link>
        <a href="#products">My Products</a>
        <a href="#orders">Orders</a>
        <a href="#profile">My Profile</a>
        <Link to="/">Logout</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <p className="section-tag">FARMER DASHBOARD</p>
            <h1>Welcome, Farmer!</h1>
            <p>Manage your crop listings, stock, and customer orders.</p>
          </div>
          <button className="register-btn">+ Add Product</button>
        </div>

        <section className="dashboard-stats">
          <div className="dashboard-stat-card">
            <p>Active Products</p>
            <h2>0</h2>
          </div>
          <div className="dashboard-stat-card">
            <p>Pending Orders</p>
            <h2>0</h2>
          </div>
          <div className="dashboard-stat-card">
            <p>Completed Orders</p>
            <h2>0</h2>
          </div>
          <div className="dashboard-stat-card">
            <p>Total Sales</p>
            <h2>₹0</h2>
          </div>
        </section>

        <section className="product-section" id="products">
          <div className="section-heading">
            <h2>My Product Listings</h2>
            <button className="login-btn">View All</button>
          </div>

          <div className="empty-product">
            <div>📦</div>
            <h3>No products added yet</h3>
            <p>Add your first crop product so businesses can find and buy it.</p>
            <button className="register-btn">+ Add Your First Product</button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default FarmerDashboard;