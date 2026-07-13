import { Link, useNavigate } from "react-router-dom";

function FarmerDashboard() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const allProducts = JSON.parse(
    localStorage.getItem("farmlinkProducts") || "[]"
  );

  const farmerProducts = currentUser
    ? allProducts.filter((product) => product.ownerEmail === currentUser.email)
    : [];

  const allOrders = JSON.parse(localStorage.getItem("farmlinkOrders") || "[]");

  const farmerOrders = currentUser
    ? allOrders.filter((order) => order.farmerEmail === currentUser.email)
    : [];

  const totalSales = farmerOrders.reduce(
    (total, order) => total + Number(order.total),
    0
  );

  function handleLogout() {
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  function deleteProduct(productId) {
    const confirmed = window.confirm("Do you want to delete this product?");

    if (!confirmed) return;

    const updatedProducts = allProducts.filter(
      (product) => product.id !== productId
    );

    localStorage.setItem("farmlinkProducts", JSON.stringify(updatedProducts));
    window.location.reload();
  }

  if (!currentUser || currentUser.accountType !== "farmer") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in as a farmer to view this page.</p>
          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <h2>🌱 FarmLink</h2>
        <Link to="/farmer-dashboard">Dashboard</Link>
        <a href="#products">My Products</a>
        <a href="#orders">Orders</a>
        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <p className="section-tag">FARMER DASHBOARD</p>
            <h1>Welcome, {currentUser.name}!</h1>
            <p>Manage your crop listings, stock, and customer orders.</p>
          </div>

          <Link className="register-btn" to="/add-product">
            + Add Product
          </Link>
        </div>

        <section className="dashboard-stats">
          <div className="dashboard-stat-card">
            <p>Active Products</p>
            <h2>{farmerProducts.length}</h2>
          </div>

          <div className="dashboard-stat-card">
            <p>Pending Orders</p>
            <h2>{farmerOrders.length}</h2>
          </div>

          <div className="dashboard-stat-card">
            <p>Completed Orders</p>
            <h2>0</h2>
          </div>

          <div className="dashboard-stat-card">
            <p>Total Sales</p>
            <h2>₹{totalSales}</h2>
          </div>
        </section>

        <section className="product-section" id="products">
          <div className="section-heading">
            <h2>My Product Listings</h2>
            <Link className="login-btn" to="/add-product">
              Add New
            </Link>
          </div>

          {farmerProducts.length === 0 ? (
            <div className="empty-product">
              <div>📦</div>
              <h3>No products added yet</h3>
              <p>Add your first crop product so businesses can find and buy it.</p>
              <Link className="register-btn" to="/add-product">
                + Add Your First Product
              </Link>
            </div>
          ) : (
            <div className="product-grid">
              {farmerProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <img
                    src={product.image || "https://placehold.co/600x400?text=FarmLink"}
                    alt={product.name}
                  />
                  <h3>{product.name}</h3>
                  <p>{product.category}</p>
                  <p>
                    {product.quantity} {product.unit}
                  </p>
                  <strong>₹{product.price} / {product.unit}</strong>
                  <p>{product.location}</p>

                  <button
                    className="delete-btn"
                    onClick={() => deleteProduct(product.id)}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="product-section" id="orders">
          <h2>Orders Received</h2>

          {farmerOrders.length === 0 ? (
            <p className="muted-text">You have not received any orders yet.</p>
          ) : (
            <div className="order-list">
              {farmerOrders.map((order) => (
                <div className="order-card" key={order.id}>
                  <div>
                    <h3>{order.productName}</h3>
                    <p>
                      Buyer: {order.businessName} · Quantity: {order.quantity}
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

export default FarmerDashboard;