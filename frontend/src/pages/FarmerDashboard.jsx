import { api } from "../api";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function FarmerDashboard() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const accountType = currentUser?.accountType;

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (accountType !== "farmer") return;

    async function loadDashboardData() {
      try {
        const [productsData, ordersData] = await Promise.all([
          api("/products/mine"),
          api("/orders/mine"),
        ]);

        setProducts(productsData);
        setOrders(ordersData);
      } catch (error) {
        alert(error.message);
      }
    }

    loadDashboardData();
  }, [accountType]);

  if (!currentUser || accountType !== "farmer") {
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

  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  );

  const completedOrders = orders.filter(
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
      await loadProducts();
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
      await Promise.all([loadOrders(), loadProducts()]);
    } catch (error) {
      alert(error.message);
    }
  }

  async function shareCurrentLocation(orderId) {
  if (!navigator.geolocation) {
    alert("Your browser does not support location sharing.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        await api(`/orders/${orderId}/location`, {
          method: "POST",
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            note: "Farmer is currently delivering your order.",
          }),
        });

        alert("Your delivery location was shared with the buyer.");
      } catch (error) {
        alert(error.message);
      }
    },
    () => {
      alert(
        "Location permission was denied. Please allow location access and try again."
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
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
            <p>Manage your product listings and buyer orders.</p>
          </div>

          <Link className="register-btn" to="/add-product">
            + Add Product
          </Link>
        </div>

        <section className="dashboard-stats">
          <div className="dashboard-stat-card">
            <p>Active Products</p>
            <h2>{products.length}</h2>
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

          {products.length === 0 ? (
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
              {products.map((product) => (
                <article className="product-card farmer-product-card" key={product.id}>
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

          {orders.length === 0 ? (
            <p className="muted-text">You have not received any orders yet.</p>
          ) : (
            <div className="order-list">
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div>
                    <h3>{order.productName}</h3>
                    <p>
                      Buyer: {order.businessName} · Quantity: {order.quantity}
                    </p>
                    <p>
                      Order Date:{" "}
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="order-right">
                    <strong>₹{order.total}</strong>
                    <span
                      className={`status status-${order.status.toLowerCase().replaceAll(" ", "-")}`}
                    >
                      {order.status}
                    </span>

                    <Link
                      className="login-btn"
                      to={`/orders/${order.id}/tracking`}
                    >
                      View Tracking
                    </Link>

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
    className="accept-btn"
    onClick={() =>
      updateOrderStatus(order.id, "Out for Delivery")
    }
  >
    Start Delivery
  </button>
)}

{order.status === "Out for Delivery" && (
  <div className="order-actions">
    <button
      className="accept-btn"
      onClick={() => shareCurrentLocation(order.id)}
    >
      Share Current Location
    </button>

    <button
      className="deliver-btn"
      onClick={() =>
        updateOrderStatus(order.id, "Delivered")
      }
    >
      Mark Delivered
    </button>
  </div>
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
