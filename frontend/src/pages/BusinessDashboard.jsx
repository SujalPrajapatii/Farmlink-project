import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function BusinessDashboard() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("farmlinkCurrentUser") || "null"
  );

  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState({});

  const products = JSON.parse(
    localStorage.getItem("farmlinkProducts") || "[]"
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchableText =
        `${product.name} ${product.category} ${product.location}`.toLowerCase();

      return searchableText.includes(search.toLowerCase());
    });
  }, [products, search]);

  function handleLogout() {
    localStorage.removeItem("farmlinkCurrentUser");
    navigate("/");
  }

  function placeOrder(product) {
    const orderQuantity = Number(quantity[product.id] || 1);

    if (orderQuantity < 1 || orderQuantity > Number(product.quantity)) {
      alert(`Enter a quantity between 1 and ${product.quantity}.`);
      return;
    }

    const orders = JSON.parse(localStorage.getItem("farmlinkOrders") || "[]");

    const newOrder = {
      id: Date.now(),
      productId: product.id,
      productName: product.name,
      quantity: orderQuantity,
      total: orderQuantity * Number(product.price),
      businessName: currentUser.name,
      businessEmail: currentUser.email,
      farmerName: product.ownerName,
      farmerEmail: product.ownerEmail,
      status: "Pending",
      createdAt: new Date().toLocaleDateString(),
    };

    localStorage.setItem("farmlinkOrders", JSON.stringify([...orders, newOrder]));
    alert("Order placed successfully!");
  }

  if (!currentUser || currentUser.accountType !== "business") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Access denied</h1>
          <p>Please log in as a business buyer to view this page.</p>
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
              <p>Try a different search, or check again later.</p>
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <img
                    src={product.image || "https://placehold.co/600x400?text=FarmLink"}
                    alt={product.name}
                  />
                  <h3>{product.name}</h3>
                  <p>{product.category}</p>
                  <p>
                    Available: {product.quantity} {product.unit}
                  </p>
                  <strong>₹{product.price} / {product.unit}</strong>
                  <p>{product.location}</p>
                  <p className="muted-text">Farmer: {product.ownerName}</p>

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
      </main>
    </div>
  );
}

export default BusinessDashboard;