import { api } from "../api";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const result = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      localStorage.setItem("farmlinkToken", result.token);

      localStorage.setItem(
        "farmlinkCurrentUser",
        JSON.stringify(result.user)
      );

      alert("Login successful!");

      const returnTo = location.state?.from?.pathname;

      if (returnTo) {
        navigate(returnTo, { replace: true });
      } else if (result.user.accountType === "farmer") {
        navigate("/farmer-dashboard");
      } else if (result.user.accountType === "business") {
        navigate("/business-dashboard");
      } else if (result.user.accountType === "delivery") {
        navigate("/delivery-dashboard");
      } else {
        navigate("/admin-dashboard");
      }
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="auth-page auth-showcase-page">
      <div className="auth-showcase">
        <section className="auth-brand-panel">
          <div className="auth-brand-content">
            <Link className="auth-brand-logo" to="/">Farm<span>Link</span></Link>
            <div className="auth-brand-copy">
              <span className="auth-leaf">✦</span>
              <h2>Trade fresh.<br />Grow together.</h2>
              <p>Direct connections for farmers, businesses, and swift delivery partners.</p>
            </div>
            <span className="auth-brand-caption">FRESH PRODUCE · DIRECT TRADE</span>
          </div>
        </section>
        <form className="auth-card auth-showcase-form" onSubmit={handleSubmit}>
          <Link className="back-link" to="/">← Back to FarmLink</Link>
          <div className="auth-form-heading">
            <span>WELCOME BACK</span>
            <h1>Log in to FarmLink</h1>
            <p>Enter your details to access your dashboard.</p>
          </div>
          <label>Email Address</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@example.com" required />
          <label>Password</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter your password" required />
          <button className="farmer-btn" type="submit">Log in <span>→</span></button>
          <p className="auth-footer">New to FarmLink? <Link to="/register">Create an account</Link></p>
        </form>
      </div>
    </div>
  );
}

export default Login;
