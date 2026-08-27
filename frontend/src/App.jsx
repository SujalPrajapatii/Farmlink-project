import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import FarmerDashboard from "./pages/FarmerDashboard";
import BusinessDashboard from "./pages/BusinessDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AddProduct from "./pages/AddProduct";
import EditProduct from "./pages/EditProduct";
import Checkout from "./pages/Checkout";
import OrderTracking from "./pages/OrderTracking";
import CategoryProducts from "./pages/CategoryProducts";
import BuyerOrders from "./pages/BuyerOrders";
import FarmerOrders from "./pages/FarmerOrders";
import { LanguageProvider, LanguageSelector, PageTranslator } from "./LanguageContext";

function ProtectedRoute({ children, roles }) {
  const location = useLocation();
  const token = localStorage.getItem("farmlinkToken");
  const currentUser = JSON.parse(localStorage.getItem("farmlinkCurrentUser") || "null");

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(currentUser?.accountType)) {
    const destination = currentUser?.accountType === "farmer"
      ? "/farmer-dashboard"
      : currentUser?.accountType === "business"
        ? "/business-dashboard"
        : "/admin-dashboard";
    return <Navigate to={destination} replace />;
  }

  return children;
}

function App() {
  return (
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
        <Route path="/business-dashboard" element={<ProtectedRoute roles={["business"]}><BusinessDashboard /></ProtectedRoute>} />
        <Route path="/my-orders" element={<ProtectedRoute roles={["business"]}><BuyerOrders /></ProtectedRoute>} />
        <Route path="/buyer-orders" element={<ProtectedRoute roles={["business"]}><BuyerOrders /></ProtectedRoute>} />
        <Route path="/admin-dashboard" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/add-product" element={<ProtectedRoute roles={["farmer"]}><AddProduct /></ProtectedRoute>} />
        <Route path="/edit-product/:id" element={<ProtectedRoute roles={["farmer"]}><EditProduct /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute roles={["business"]}><Checkout /></ProtectedRoute>} />
        <Route path="/orders/:id/tracking" element={<ProtectedRoute roles={["farmer", "business"]}><OrderTracking /></ProtectedRoute>} />
        <Route path="/categories/:category" element={<CategoryProducts />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
