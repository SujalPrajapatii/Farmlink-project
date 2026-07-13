import { api } from "../api";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";


function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    accountType: "",
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
      } else {
        navigate("/business-dashboard");
      }
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link className="back-link" to="/">
          ← Back to FarmLink
        </Link>

        <h1>Create Account</h1>
        <p>Join FarmLink as a farmer or business buyer.</p>

        <label>Full Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter your name"
          required
        />

        <label>Email Address</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
        />

        <label>Account Type</label>
        <select
          name="accountType"
          value={formData.accountType}
          onChange={handleChange}
          required
        >
          <option value="">Select account type</option>
          <option value="farmer">Farmer</option>
          <option value="business">Business Buyer</option>
        </select>

        <label>Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Create a password"
          minLength="6"
          required
        />

        <button className="farmer-btn" type="submit">
          Create Account
        </button>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;