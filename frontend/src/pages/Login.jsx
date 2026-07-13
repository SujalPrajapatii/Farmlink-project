import { api } from "../api";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

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

  async function handleSubmit(event) 
  {
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
    
      if (result.user.accountType === "farmer") {
        navigate("/farmer-dashboard");
      } else if (result.user.accountType === "business") {
        navigate("/business-dashboard");
      } else {
        navigate("/admin-dashboard");
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

        <h1>Welcome Back</h1>
        <p>Login to manage your FarmLink account.</p>

        <label>Email Address</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
        />

        <label>Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password"
          required
        />

        <button className="farmer-btn" type="submit">
          Login
        </button>

        <p className="auth-footer">
          New to FarmLink? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;