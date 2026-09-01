import { api } from "../api";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";


function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    accountType: "",
    phone: "",
    vehicleType: "Bike",
    vehicleNumber: "",
    password: "",
  });

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) 
  {
    event.preventDefault();

    try {
      const result = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(formData),
      });
    
      localStorage.setItem("farmlinkToken", result.token);
    
      localStorage.setItem(
        "farmlinkCurrentUser",
        JSON.stringify(result.user)
      );
    
      alert("Account created successfully!");
    
      if (result.user.accountType === "farmer") {
        navigate("/farmer-dashboard");
      } else if (result.user.accountType === "delivery") {
        navigate("/delivery-dashboard");
      } else {
        navigate("/business-dashboard");
      }
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="auth-page auth-showcase-page">
      <div className="auth-showcase auth-showcase-register">
        <section className="auth-brand-panel">
          <div className="auth-brand-content">
            <Link className="auth-brand-logo" to="/">Farm<span>Link</span></Link>
            <div className="auth-brand-copy">
              <span className="auth-leaf">✦</span>
              <h2>Your harvest.<br />A bigger market.</h2>
              <p>Join a trusted network built for simple, transparent agricultural trade and reliable delivery.</p>
            </div>
            <span className="auth-brand-caption">GROW · CONNECT · DELIVER</span>
          </div>
        </section>
        <form className="auth-card auth-showcase-form" onSubmit={handleSubmit}>
          <Link className="back-link" to="/">← Back to FarmLink</Link>
          <div className="auth-form-heading"><span>JOIN FARMLINK</span><h1>Create your account</h1><p>Tell us a little about yourself to get started.</p></div>
          <div className="auth-two-fields">
            <div>
              <label>Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Your full name" required />
            </div>
            <div>
              <label>Account Type</label>
              <select name="accountType" value={formData.accountType} onChange={handleChange} required>
                <option value="">Choose role</option>
                <option value="farmer">Farmer</option>
                <option value="business">Business Buyer</option>
                <option value="delivery">Delivery Rider / Partner</option>
              </select>
            </div>
          </div>

          {formData.accountType === "delivery" && (
            <>
              <div className="auth-two-fields">
                <div>
                  <label>Phone Number (for Delivery)</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
                <div>
                  <label>Vehicle Type</label>
                  <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} required>
                    <option value="Motorcycle / Bike">Motorcycle / Bike</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Electric Scooter">Electric Scooter</option>
                    <option value="Delivery Van / Mini Truck">Delivery Van / Mini Truck</option>
                    <option value="Bicycle">Bicycle</option>
                  </select>
                </div>
              </div>
              <label>Vehicle Registration Number (Optional)</label>
              <input
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                placeholder="e.g. GJ-01-AB-1234"
              />
            </>
          )}

          <label>Email Address</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@example.com" required />
          <label>Password</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="At least 6 characters" minLength="6" required />
          <button className="farmer-btn" type="submit">Create account <span>→</span></button>
          <p className="auth-footer">Already have an account? <Link to="/login">Log in</Link></p>
        </form>
      </div>
    </div>
  );
}

export default Register;
