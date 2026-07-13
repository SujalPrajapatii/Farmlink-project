import { api } from "../api";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function FarmerDashboard() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const [products, setProducts] = useState([]);

  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (currentUser) {
      loadProducts();
      loadOrders();
    }
  }, []);

  if (!currentUser || currentUser.accountType !== "farmer") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in as a farmer to continue.</p>
          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const farmerProducts = products.filter(
    (product) => product.ownerEmail === currentUser.email
  );

  const farmerOrders = orders.filter(
    (order) => order.farmerEmail === currentUser.email
  );

  const pendingOrders = farmerOrders.filter(
    (order) => order.status === "Pending"
  );

  const completedOrders = farmerOrders.filter(
    (order) => order.status === "Delivered"
  );

  const totalSales = completedOrders.reduce(
    (total, order) => total + Number(order.total),
    0
  );

  async function loadProducts() {
    try {
      const data = await api("/products/mine");
      setProducts(data);
    } catch (error) {
      alert(error.message);
    }
  }
  
  async function loadOrders() {
    try {
      const data = await api("/orders/mine");
      setOrders(data);
    } catch (error) {
      alert(error.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem("farmlinkToken");
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  async function deleteProduct(productId) {
    const confirmed = window.confirm(
      "Do you want to delete this product?"
    );
  
    if (!confirmed) return;
  
    try {
      await api(`/products/${productId}`, {
        method: "DELETE",
      });
  
      alert("Product deleted successfully.");
      loadProducts();
    } catch (error) {
      alert(error.message);
    }
  }

  async function updateOrderStatus(orderId, status) {
    try {
      await api(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
  
      alert("Order updated successfully.");
      loadOrders();
      loadProducts();
    } catch (error) {
      alert(error.message);
    }
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
            <p>Manage your product listings and buyer orders.</p>
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
            <h2>{pendingOrders.length}</h2>
          </div>

          <div className="dashboard-stat-card">
            <p>Completed Orders</p>
            <h2>{completedOrders.length}</h2>
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
              <p>Add your first crop product so businesses can find it.</p>

              <Link className="register-btn" to="/add-product">
                + Add Your First Product
              </Link>
            </div>
          ) : (
            <div className="product-grid">
              {farmerProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <img
                    src={
                      product.image ||
                      "https://placehold.co/600x400?text=FarmLink"
                    }
                    alt={product.name}
                  />

                  <h3>{product.name}</h3>
                  <p>{product.category}</p>
                  <p>
                    Available: {product.quantity} {product.unit}
                  </p>
                  <strong>
                    ₹{product.price} / {product.unit}
                  </strong>
                  <p>{product.location}</p>

                  <div className="product-actions">
                    <Link
                      className="edit-btn"
                      to={`/edit-product/${product.id}`}
                    >
                      Edit
                    </Link>

                    <button
                      className="delete-btn"
                      onClick={() => deleteProduct(product.id)}
                    >
                      Delete
                    </button>
                  </div>
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
                <article className="order-card" key={order.id}>
                  <div>
                    <h3>{order.productName}</h3>
                    <p>
                      Buyer: {order.businessName} · Quantity: {order.quantity}
                    </p>
                    <p>Order Date: {order.createdAt}</p>
                  </div>

                  <div className="order-right">
                    <strong>₹{order.total}</strong>
                    <span className={`status status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>

                    {order.status === "Pending" && (
                      <div className="order-actions">
                        <button
                          className="accept-btn"
                          onClick={() =>
                            updateOrderStatus(order.id, "Accepted")
                          }
                        >
                          Accept
                        </button>

                        <button
                          className="cancel-btn"
                          onClick={() =>
                            updateOrderStatus(order.id, "Cancelled")
                          }
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {order.status === "Accepted" && (
                      <button
                        className="deliver-btn"
                        onClick={() =>
                          updateOrderStatus(order.id, "Delivered")
                        }
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default FarmerDashboard;