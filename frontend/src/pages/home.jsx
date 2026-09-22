import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CATEGORY_IMAGES } from "../productImages";

const categoryCards = [
  { name: "Vegetables", image: CATEGORY_IMAGES.vegetables },
  { name: "Fruits", image: CATEGORY_IMAGES.fruits },
  { name: "Grains", image: CATEGORY_IMAGES.grains },
  { name: "Pulses", image: CATEGORY_IMAGES.pulses },
];

function Home() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const currentUser = JSON.parse(localStorage.getItem("farmlinkCurrentUser") || "null");
  const dashboardPath = currentUser?.accountType === "farmer" ? "/farmer-dashboard" : currentUser?.accountType === "business" ? "/business-dashboard" : currentUser?.accountType === "delivery" ? "/delivery-dashboard" : currentUser?.accountType === "admin" ? "/admin-dashboard" : null;

  function handleSearch(e) {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;
    executeSearch(searchTerm);
  }

  function executeSearch(query) {
    if (!query || !query.trim()) return;
    const cleanQuery = query.trim();
    if (currentUser?.accountType === "business") {
      navigate(`/business-dashboard?search=${encodeURIComponent(cleanQuery)}`);
    } else {
      navigate(`/categories/all?search=${encodeURIComponent(cleanQuery)}`);
    }
  }

  return <div className="app">
    <header className="navbar">
      <Link className="logo" to="/">Farm<span>Link</span></Link>
      <nav aria-label="Primary navigation"><a className="home-nav-link" href="#home">Home</a><a className="home-nav-link" href="#how-it-works">How It Works</a><a className="home-nav-link" href="#categories">Categories</a></nav>
      <div className="nav-buttons">
        {dashboardPath ? <Link className="register-btn" to={dashboardPath}>My Dashboard</Link> : <><Link className="login-btn" to="/login">Login</Link><Link className="register-btn" to="/register">Join FarmLink</Link></>}
      </div>
    </header>
    <main id="home">
      <section className="hero">
        <div className="hero-text">
          <p className="tag">GROW MORE. TRADE SMARTER.</p>
          <h1>Fresh from the farm,<br /><em>straight to your business.</em></h1>
          <p className="hero-description">FarmLink brings trusted farmers and serious buyers together for transparent pricing, dependable quality, and simpler agricultural trade.</p>

          <form className="hero-search-box" onSubmit={handleSearch}>
            <div className="hero-search-input-wrapper">
              <span className="hero-search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                className="hero-search-input"
                placeholder="Search crops, produce, or farm locations (e.g. Tomatoes, Wheat, Nashik)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="hero-search-clear"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
              <button type="submit" className="hero-search-btn">
                Search
              </button>
            </div>
            <div className="hero-search-tags">
              <span className="hero-search-tag-label">Popular:</span>
              {["Tomatoes", "Potatoes", "Onions", "Wheat", "Mangoes"].map((tag) => (
                <button
                  type="button"
                  key={tag}
                  className="hero-search-tag"
                  onClick={() => executeSearch(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </form>

          <div className="hero-buttons"><Link className="farmer-btn link-button" to="/register">Start selling <span>→</span></Link><a className="hero-text-link" href="#categories">Explore produce <span>↓</span></a></div>
          <div className="hero-proof"><div className="avatar-stack"><i>🌿</i><i>🍅</i><i>🌾</i></div><span>Built for farmers, retailers, and food businesses across India.</span></div>
        </div>
        <div className="hero-visual" aria-label="Fresh vegetables ready for market"><div className="hero-orb orb-one" /><div className="hero-orb orb-two" /><img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=85" alt="Fresh vegetables in a market" /><div className="hero-float-card"><strong>Farm to business</strong><span>One simple platform</span></div><div className="hero-float-rating"><b>★ 4.9</b><span>Trusted trade</span></div></div>
      </section>
      <section className="stats" aria-label="FarmLink community"><div><h2>500<span>+</span></h2><p>Farmers growing with us</p></div><div><h2>200<span>+</span></h2><p>Active business buyers</p></div><div><h2>1,000<span>+</span></h2><p>Product listings</p></div><div><h2>25<span>+</span></h2><p>Crop categories</p></div></section>
      <section className="how-it-works" id="how-it-works"><p className="section-tag">ONE PLATFORM, CLEARER TRADE</p><h2>A better way to move produce.</h2><p className="section-intro">From your harvest to a buyer’s doorstep, FarmLink keeps each step straightforward.</p><div className="steps"><article><span>01</span><div className="step-icon">⌁</div><h3>List your harvest</h3><p>Share crop details, quantity, price, location, and photos in minutes.</p></article><article><span>02</span><div className="step-icon">⌕</div><h3>Find the right match</h3><p>Buyers browse available stock by category, price, and location.</p></article><article><span>03</span><div className="step-icon">✓</div><h3>Trade with confidence</h3><p>Manage orders, payment, delivery updates, and live tracking in one place.</p></article></div></section>
      <section className="platform-benefits" aria-labelledby="benefits-title">
        <div className="benefits-intro"><p className="section-tag">BUILT FOR BOTH SIDES OF TRADE</p><h2 id="benefits-title">The tools to trade with clarity.</h2><p>FarmLink keeps the important details visible—from available stock to payment and delivery updates—so each business decision feels more straightforward.</p></div>
        <div className="benefit-grid">
          <article className="benefit-card farmer-benefit"><span className="benefit-icon" aria-hidden="true">🌱</span><p className="benefit-label">FOR FARMERS</p><h3>Turn harvest into opportunity.</h3><ul><li>Create and manage crop listings</li><li>Receive and fulfil buyer orders</li><li>Share delivery progress when you are on the move</li></ul><Link to="/register">Start selling <span>→</span></Link></article>
          <article className="benefit-card buyer-benefit"><span className="benefit-icon" aria-hidden="true">🧺</span><p className="benefit-label">FOR BUYERS</p><h3>Source fresh produce with confidence.</h3><ul><li>Browse crops by category, price, and location</li><li>Choose delivery details and payment method at checkout</li><li>Follow order and delivery updates in one place</li></ul><Link to="/register">Explore FarmLink <span>→</span></Link></article>
        </div>
      </section>
      <section className="categories" id="categories"><div className="category-heading"><div><p className="section-tag">SEASONAL & FRESH</p><h2>Explore farm produce.</h2></div><p>Discover what local growers have ready for your next order.</p></div><div className="category-grid">{categoryCards.map((category) => <Link className="category-card" key={category.name} to={`/categories/${category.name.toLowerCase()}`}><img src={category.image} alt={category.name} /><span>{category.name}<small>Explore →</small></span></Link>)}</div></section>
      <section className="trade-assurance" aria-label="FarmLink marketplace features">
        <div className="trade-assurance-image"><img src="https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=1200&q=85" alt="Fresh farm produce arranged for market" loading="lazy" /></div>
        <div className="trade-assurance-copy"><p className="section-tag">A MORE CONNECTED MARKETPLACE</p><h2>Know what is happening at every step.</h2><p>FarmLink brings product listings, checkout, orders, payment status, and delivery updates into one focused workspace.</p><div className="assurance-list"><div><span aria-hidden="true">01</span><p><strong>Clear product information</strong><small>Review quantity, price, unit, category, and farm location before you order.</small></p></div><div><span aria-hidden="true">02</span><p><strong>Checkout built for business buying</strong><small>Use saved delivery addresses and choose cash-on-delivery or online payment.</small></p></div><div><span aria-hidden="true">03</span><p><strong>Order updates that stay visible</strong><small>Track the current order status and shared delivery location when available.</small></p></div></div></div>
      </section>
      <section className="home-cta"><div><p className="section-tag">READY WHEN YOU ARE</p><h2>Grow your market with FarmLink.</h2><p>Join a simpler, more transparent way to buy and sell agricultural produce.</p></div><Link className="farmer-btn" to="/register">Create your account <span>→</span></Link></section>
    </main>
    <footer className="home-footer"><div className="footer-brand"><Link className="logo" to="/">Farm<span>Link</span></Link><p>Direct trade for fresh agricultural produce.</p></div><div className="footer-links"><div><strong>Marketplace</strong><Link to="/categories/vegetables">Browse produce</Link><Link to="/register">Join FarmLink</Link></div><div><strong>Account</strong><Link to="/login">Log in</Link>{dashboardPath && <Link to={dashboardPath}>My dashboard</Link>}</div></div><span>© {new Date().getFullYear()} FarmLink</span></footer>
  </div>;
}

export default Home;
