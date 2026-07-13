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

  function handleSubmit(event) {
    event.preventDefault();

    const users = JSON.parse(localStorage.getItem("farmlinkUsers") || "[]");

    const alreadyExists = users.some(
      (user) => user.email.toLowerCase() === formData.email.toLowerCase()
    );

    if (alreadyExists) {
      alert("An account with this email already exists.");
      return;
    }

    const newUser = {
      ...formData,
      email: formData.email.toLowerCase(),
      id: Date.now(),
    };

    localStorage.setItem("farmlinkUsers", JSON.stringify([...users, newUser]));
    localStorage.setItem("farmlinkCurrentUser", JSON.stringify(newUser));

    alert("Account created successfully!");

    if (newUser.accountType === "farmer") {
      navigate("/farmer-dashboard");
    } else {
      navigate("/business-dashboard");
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