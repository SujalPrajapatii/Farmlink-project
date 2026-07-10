import { Link } from "react-router-dom";

function Login() {
  function handleSubmit(event) {
    event.preventDefault();
    alert("Login will be connected to the database later.");
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link className="back-link" to="/">← Back to FarmLink</Link>
        <h1>Welcome Back</h1>
        <p>Login to manage your FarmLink account.</p>

        <label>Email Address</label>
        <input type="email" placeholder="Enter your email" required />

        <label>Password</label>
        <input type="password" placeholder="Enter your password" required />

        <button className="farmer-btn" type="submit">Login</button>

        <p className="auth-footer">
          New to FarmLink? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;