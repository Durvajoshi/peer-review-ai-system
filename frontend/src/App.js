import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"

import ReviewPage from "./pages/ReviewPage"
import AdminDashboard from "./pages/AdminDashboard"
import LoginPage from "./pages/LoginPage"

function App() {

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute allowedRoles={['Employee', 'Admin']} />}>
            <Route path="/" element={<ReviewPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )

}

export default App