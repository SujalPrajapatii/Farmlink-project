import { Component } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation, Link } from "react-router-dom";
import Home from "./pages/home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import FarmerDashboard from "./pages/FarmerDashboard";
import BusinessDashboard from "./pages/BusinessDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminFarmers from "./pages/admin/AdminFarmers";
import AdminBuyers from "./pages/admin/AdminBuyers";
import AdminRiders from "./pages/admin/AdminRiders";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AddProduct from "./pages/AddProduct";
import EditProduct from "./pages/EditProduct";
import Checkout from "./pages/Checkout";
import OrderTracking from "./pages/OrderTracking";
import CategoryProducts from "./pages/CategoryProducts";
import BuyerOrders from "./pages/BuyerOrders";
import FarmerOrders from "./pages/FarmerOrders";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import BuyerNotifications from "./pages/BuyerNotifications";
import FarmerNotifications from "./pages/FarmerNotifications";
import DeliveryNotifications from "./pages/DeliveryNotifications";
import { LanguageProvider, LanguageSelector, PageTranslator } from "./LanguageContext";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "#f8fafc", fontFamily: "sans-serif" }}>
          <div style={{ maxWidth: "480px", width: "100%", background: "#fff", padding: "30px", borderRadius: "14px", border: "1px solid #e2e8f0", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚠️</div>
            <h2 style={{ color: "#1e293b", margin: "0 0 10px" }}>Something went wrong</h2>
            <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 20px" }}>
              {this.state.error?.message || "An unexpected error occurred while loading this page."}
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }} style={{ padding: "10px 18px", background: "#166534", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>
                Reload Page
              </button>
              <a href="/" style={{ padding: "10px 18px", background: "#f1f5f9", color: "#334155", borderRadius: "8px", textDecoration: "none", fontWeight: 600 }}>
                Go to Home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children, roles }) {
  const location = useLocation();
  const token = localStorage.getItem("farmlinkToken");
  const currentUser = JSON.parse(localStorage.getItem("farmlinkCurrentUser") || "null");

  if (!token || !currentUser || !currentUser.accountType) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(currentUser.accountType)) {
    const destination = currentUser.accountType === "farmer"
      ? "/farmer-dashboard"
      : currentUser.accountType === "business"
        ? "/business-dashboard"
        : currentUser.accountType === "delivery"
          ? "/delivery-dashboard"
          : "/admin-dashboard";
    return <Navigate to={destination} replace />;
  }

  return children;
}

function OrdersRoute() {
  const currentUser = JSON.parse(localStorage.getItem("farmlinkCurrentUser") || "null");
  const token = localStorage.getItem("farmlinkToken");
  if (!token || !currentUser || !currentUser.accountType) return <Navigate to="/login" replace />;
  if (currentUser.accountType === "farmer") return <FarmerOrders />;
  if (currentUser.accountType === "business") return <BuyerOrders />;
  if (currentUser.accountType === "delivery") return <DeliveryDashboard />;
  if (currentUser.accountType === "admin") return <AdminDashboard />;
  return <Navigate to="/" replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <LanguageProvider>
        <PageTranslator />
        <LanguageSelector />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/farmer-dashboard" element={<ProtectedRoute roles={["farmer"]}><FarmerDashboard /></ProtectedRoute>} />
          <Route path="/farmer-orders" element={<ProtectedRoute roles={["farmer"]}><FarmerOrders /></ProtectedRoute>} />
          <Route path="/orders-received" element={<ProtectedRoute roles={["farmer"]}><FarmerOrders /></ProtectedRoute>} />
          <Route path="/business-dashboard" element={<ProtectedRoute roles={["business", "farmer", "admin"]}><BusinessDashboard /></ProtectedRoute>} />
          <Route path="/delivery-dashboard" element={<ProtectedRoute roles={["delivery"]}><DeliveryDashboard /></ProtectedRoute>} />
          <Route path="/rider-dashboard" element={<ProtectedRoute roles={["delivery"]}><DeliveryDashboard /></ProtectedRoute>} />
          <Route path="/my-orders" element={<OrdersRoute />} />
          <Route path="/orders" element={<OrdersRoute />} />
          <Route path="/view-orders" element={<OrdersRoute />} />
          <Route path="/buyer-orders" element={<ProtectedRoute roles={["business", "farmer", "admin"]}><BuyerOrders /></ProtectedRoute>} />
          <Route path="/admin-dashboard" element={<ProtectedRoute roles={["admin"]}><AdminOverview /></ProtectedRoute>} />
          <Route path="/admin/overview" element={<ProtectedRoute roles={["admin"]}><AdminOverview /></ProtectedRoute>} />
          <Route path="/admin/farmers" element={<ProtectedRoute roles={["admin"]}><AdminFarmers /></ProtectedRoute>} />
          <Route path="/admin/buyers" element={<ProtectedRoute roles={["admin"]}><AdminBuyers /></ProtectedRoute>} />
          <Route path="/admin/riders" element={<ProtectedRoute roles={["admin"]}><AdminRiders /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute roles={["admin"]}><AdminProducts /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute roles={["admin"]}><AdminOrders /></ProtectedRoute>} />
          <Route path="/add-product" element={<ProtectedRoute roles={["farmer", "admin"]}><AddProduct /></ProtectedRoute>} />
          <Route path="/edit-product/:id" element={<ProtectedRoute roles={["farmer", "admin"]}><EditProduct /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute roles={["business"]}><Checkout /></ProtectedRoute>} />
          <Route path="/orders/:id/tracking" element={<ProtectedRoute roles={["farmer", "business", "delivery", "admin"]}><OrderTracking /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute roles={["business", "farmer", "admin"]}><BuyerNotifications /></ProtectedRoute>} />
          <Route path="/buyer-notifications" element={<ProtectedRoute roles={["business", "farmer", "admin"]}><BuyerNotifications /></ProtectedRoute>} />
          <Route path="/farmer-notifications" element={<ProtectedRoute roles={["farmer"]}><FarmerNotifications /></ProtectedRoute>} />
          <Route path="/delivery-notifications" element={<ProtectedRoute roles={["delivery"]}><DeliveryNotifications /></ProtectedRoute>} />
          <Route path="/rider-notifications" element={<ProtectedRoute roles={["delivery"]}><DeliveryNotifications /></ProtectedRoute>} />
          <Route path="/categories/:category" element={<CategoryProducts />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
