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
import { LanguageProvider, LanguageSelector, PageTranslator } from "./LanguageContext";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("farmlinkToken");

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
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
        <Route path="/farmer-dashboard" element={<FarmerDashboard />} />
        <Route path="/business-dashboard" element={<BusinessDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/add-product" element={<AddProduct />} />
        <Route path="/edit-product/:id" element={<EditProduct />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders/:id/tracking" element={<OrderTracking />} />
        <Route
          path="/categories/:category"
          element={
            <ProtectedRoute>
              <CategoryProducts />
            </ProtectedRoute>
          }
        />
      </Routes>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
