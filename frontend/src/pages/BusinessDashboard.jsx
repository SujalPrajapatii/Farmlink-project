import { api } from "../api";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function BusinessDashboard() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const [products, setProducts] = useState([]);

  const [orders, setOrders] = useState([]);

  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState({});

  useEffect(() => {
    if (currentUser) {
      loadProducts();
      loadOrders();
    }
  }, []);

  if (!currentUser || currentUser.accountType !== "business") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in as a business buyer to continue.</p>
          <Link className="farmer-btn" to="/login">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchableText =
        `${product.name} ${product.category} ${product.location}`.toLowerCase();

      return (
        Number(product.quantity) > 0 &&
        searchableText.includes(search.toLowerCase())
      );
    });
  }, [products, search]);

  const businessOrders = orders.filter(
    (order) => order.businessEmail === currentUser.email
  );

  async function loadProducts() {
    try {
      const data = await api("/products");
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

  async function placeOrder(product) {
    const orderQuantity = Number(quantity[product.id] || 1);
  
    if (orderQuantity < 1 || orderQuantity > Number(product.quantity)) {
      alert(`Enter a quantity between 1 and ${product.quantity}.`);
      return;
    }
  
    try {
      await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          quantity: orderQuantity,
        }),
      });
  
      alert("Order placed successfully!");
  
      loadProducts();
      loadOrders();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <h2>🌱 FarmLink</h2>
        <Link to="/business-dashboard">Marketplace</Link>
        <a href="#products">Available Products</a>
        <a href="#orders">My Orders</a>

        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <p className="section-tag">BUSINESS DASHBOARD</p>
            <h1>Welcome, {currentUser.name}!</h1>
            <p>Browse fresh produce directly from farmers.</p>
          </div>
        </div>

        <input
          className="product-search"
          type="search"
          placeholder="Search crop, category, or location..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <section className="product-section" id="products">
          <div className="section-heading">
            <h2>Available Products</h2>
            <span>{filteredProducts.length} product(s)</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-product">
              <div>🧺</div>
              <h3>No products found</h3>
              <p>Try another search or check again later.</p>
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
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
                  <p className="muted-text">Farmer: {product.ownerName}</p>

                  <label className="quantity-label">Order Quantity</label>
                  <input
                    className="quantity-input"
                    type="number"
                    min="1"
                    max={product.quantity}
                    value={quantity[product.id] || 1}
                    onChange={(event) =>
                      setQuantity({
                        ...quantity,
                        [product.id]: event.target.value,
                      })
                    }
                  />

                  <button
                    className="register-btn full-width"
                    onClick={() => placeOrder(product)}
                  >
                    Place Order
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="product-section" id="orders">
          <h2>My Orders</h2>

          {businessOrders.length === 0 ? (
            <p className="muted-text">You have not placed any orders yet.</p>
          ) : (
            <div className="order-list">
              {businessOrders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div>
                    <h3>{order.productName}</h3>
                    <p>
                      Farmer: {order.farmerName} · Quantity: {order.quantity}
                    </p>
                    <p>Order Date: {order.createdAt}</p>
                  </div>

                  <div className="order-right">
                    <strong>₹{order.total}</strong>
                    <span className={`status status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
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

export default BusinessDashboard;