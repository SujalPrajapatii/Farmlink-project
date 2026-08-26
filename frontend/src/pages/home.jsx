import { Link } from "react-router-dom";

const categoryCards = [
  { name: "Vegetables", image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80" },
  { name: "Fruits", image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=900&q=80" },
  { name: "Grains", image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?q=80&w=1989&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
  { name: "Pulses", image: "https://plus.unsplash.com/premium_photo-1699453179951-4f51c39644ac?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
];

function Home() {
  const currentUser = JSON.parse(localStorage.getItem("farmlinkCurrentUser") || "null");
  const dashboardPath = currentUser?.accountType === "farmer" ? "/farmer-dashboard" : currentUser?.accountType === "business" ? "/business-dashboard" : currentUser?.accountType === "admin" ? "/admin-dashboard" : null;

  return <div className="app">
    <header className="navbar">
      <Link className="logo" to="/">Farm<span>Link</span></Link>
      <nav aria-label="Primary navigation"><a href="#home">Home</a><a href="#how-it-works">How It Works</a><a href="#categories">Categories</a></nav>
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
          <div className="hero-buttons"><Link className="farmer-btn link-button" to="/register">Start selling <span>→</span></Link><a className="hero-text-link" href="#categories">Explore produce <span>↓</span></a></div>
          <div className="hero-proof"><div className="avatar-stack"><i>🌿</i><i>🍅</i><i>🌾</i></div><span>Built for farmers, retailers, and food businesses across India.</span></div>
        </div>
        <div className="hero-visual" aria-label="Fresh vegetables ready for market"><div className="hero-orb orb-one" /><div className="hero-orb orb-two" /><img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=85" alt="Fresh vegetables in a market" /><div className="hero-float-card"><strong>Farm to business</strong><span>One simple platform</span></div><div className="hero-float-rating"><b>★ 4.9</b><span>Trusted trade</span></div></div>
      </section>
      <section className="stats" aria-label="FarmLink community"><div><h2>500<span>+</span></h2><p>Farmers growing with us</p></div><div><h2>200<span>+</span></h2><p>Active business buyers</p></div><div><h2>1,000<span>+</span></h2><p>Product listings</p></div><div><h2>25<span>+</span></h2><p>Crop categories</p></div></section>
      <section className="how-it-works" id="how-it-works"><p className="section-tag">ONE PLATFORM, CLEARER TRADE</p><h2>A better way to move produce.</h2><p className="section-intro">From your harvest to a buyer’s doorstep, FarmLink keeps each step straightforward.</p><div className="steps"><article><span>01</span><div className="step-icon">⌁</div><h3>List your harvest</h3><p>Share crop details, quantity, price, location, and photos in minutes.</p></article><article><span>02</span><div className="step-icon">⌕</div><h3>Find the right match</h3><p>Buyers browse available stock by category, price, and location.</p></article><article><span>03</span><div className="step-icon">✓</div><h3>Trade with confidence</h3><p>Manage orders, payment, delivery updates, and live tracking in one place.</p></article></div></section>
      <section className="categories" id="categories"><div className="category-heading"><div><p className="section-tag">SEASONAL & FRESH</p><h2>Explore farm produce.</h2></div><p>Discover what local growers have ready for your next order.</p></div><div className="category-grid">{categoryCards.map((category) => <Link className="category-card" key={category.name} to={`/categories/${category.name.toLowerCase()}`}><img src={category.image} alt={category.name} /><span>{category.name}<small>Explore →</small></span></Link>)}</div></section>
      <section className="home-cta"><div><p className="section-tag">READY WHEN YOU ARE</p><h2>Grow your market with FarmLink.</h2><p>Join a simpler, more transparent way to buy and sell agricultural produce.</p></div><Link className="farmer-btn" to="/register">Create your account <span>→</span></Link></section>
    </main>
    <footer className="home-footer"><Link className="logo" to="/">Farm<span>Link</span></Link><p>Direct trade. Better outcomes.</p><span>© {new Date().getFullYear()} FarmLink</span></footer>
  </div>;
}

export default Home;
