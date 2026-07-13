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

  function handleSubmit(event) {
    event.preventDefault();

    const users = JSON.parse(localStorage.getItem("farmlinkUsers") || "[]");

    const user = users.find(
      (savedUser) =>
        savedUser.email === formData.email.toLowerCase() &&
        savedUser.password === formData.password
    );

    if (!user) {
      alert("Invalid email or password.");
      return;
    }

    localStorage.setItem("farmlinkCurrentUser", JSON.stringify(user));
    alert("Login successful!");

    if (user.accountType === "farmer") {
      navigate("/farmer-dashboard");
    } else if (user.accountType === "business") {
      navigate("/business-dashboard");
    } else {
      navigate("/admin-dashboard");
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