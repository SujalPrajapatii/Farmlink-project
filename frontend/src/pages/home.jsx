import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="app">
      <header className="navbar">
        <div className="logo">🌱 FarmLink</div>

        <nav>
          <a href="#home">Home</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#categories">Categories</a>
        </nav>

        <div className="nav-buttons">
          <Link className="login-btn" to="/login">
            Login
          </Link>
          <Link className="register-btn" to="/register">
            Register
          </Link>
        </div>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-text">
            <p className="tag">DIRECT FARMER-TO-BUSINESS MARKETPLACE</p>
            <h1>Fresh Produce. Fair Prices. Direct Connections.</h1>
            <p className="hero-description">
              FarmLink helps farmers sell their crop stock directly to verified
              businesses, creating transparent agricultural trade.
            </p>

            <div className="hero-buttons">
              <Link className="farmer-btn link-button" to="/register">
                I am a Farmer
              </Link>
              <Link className="business-btn link-button" to="/register">
                I am a Business
              </Link>
            </div>
          </div>

          <div className="hero-card">
            <div className="crop-icon">🥬</div>
            <h2>Fresh from Farms</h2>
            <p>Buy directly from verified farmers near you.</p>
          </div>
        </section>

        <section className="stats">
          <div>
            <h2>500+</h2>
            <p>Farmers</p>
          </div>
          <div>
            <h2>200+</h2>
            <p>Businesses</p>
          </div>
          <div>
            <h2>1,000+</h2>
            <p>Product Listings</p>
          </div>
          <div>
            <h2>25+</h2>
            <p>Crop Categories</p>
          </div>
        </section>

        <section className="how-it-works" id="how-it-works">
          <p className="section-tag">SIMPLE PROCESS</p>
          <h2>How FarmLink Works</h2>

          <div className="steps">
            <article>
              <span>1</span>
              <h3>Farmers List Stock</h3>
              <p>Add crop details, quantity, price, location, and images.</p>
            </article>

            <article>
              <span>2</span>
              <h3>Businesses Search</h3>
              <p>Find products using category, price, and location.</p>
            </article>

            <article>
              <span>3</span>
              <h3>Order & Delivery</h3>
              <p>Farmers accept orders, prepare stock, and complete delivery.</p>
            </article>
          </div>
        </section>

        <section className="categories" id="categories">
          <p className="section-tag">CROP CATEGORIES</p>
          <h2>Find What You Need</h2>

          <div className="category-grid">
            <div>🥔 Vegetables</div>
            <div>🍎 Fruits</div>
            <div>🌾 Grains</div>
            <div>🫘 Pulses</div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;