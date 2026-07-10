import { Link } from "react-router-dom";

function Register() {
  function handleSubmit(event) {
    event.preventDefault();
    alert("Registration will be connected to the database later.");
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link className="back-link" to="/">← Back to FarmLink</Link>
        <h1>Create Account</h1>
        <p>Join FarmLink as a farmer or business buyer.</p>

        <label>Full Name</label>
        <input type="text" placeholder="Enter your name" required />

        <label>Email Address</label>
        <input type="email" placeholder="Enter your email" required />

        <label>Account Type</label>
        <select required>
          <option value="">Select account type</option>
          <option value="farmer">Farmer</option>
          <option value="business">Business Buyer</option>
        </select>

        <label>Password</label>
        <input type="password" placeholder="Create a password" required />

        <button className="farmer-btn" type="submit">Create Account</button>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;