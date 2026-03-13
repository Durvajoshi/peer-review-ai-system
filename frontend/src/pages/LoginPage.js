import React, { useState } from "react";
import "./LoginPage.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
    const [credentials, setCredentials] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials({ ...credentials, [name]: value });
        // Clear field-specific error when user starts typing
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: "" }));
        }
        setError("");
    };

    const validate = () => {
        const errors = {};
        if (!credentials.email.trim()) {
            errors.email = "Email address is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
            errors.email = "Please enter a valid email address.";
        }
        if (!credentials.password) {
            errors.password = "Password is required.";
        } else if (credentials.password.length < 6) {
            errors.password = "Password must be at least 6 characters.";
        }
        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        const errors = validate();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});

        try {
            const res = await axios.post("http://localhost:5000/api/auth/login", credentials);
            login(res.data.token, res.data.user);

            // Redirect based on role
            if (res.data.user.role === "Admin") {
                navigate("/admin");
            } else {
                navigate("/");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Invalid email or password. Please try again.");
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo-placeholder">PR</div>
                    <h2 className="login-title">Welcome Back</h2>
                    <p className="login-subtitle">Sign in to Peer Review AI System</p>
                </div>
                
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit} className="login-form" noValidate>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            value={credentials.email}
                            onChange={handleChange}
                            className={`form-input ${fieldErrors.email ? "form-input-error" : ""}`}
                            placeholder="e.g., you@company.com"
                        />
                        {fieldErrors.email && <span className="login-field-error">{fieldErrors.email}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            name="password"
                            value={credentials.password}
                            onChange={handleChange}
                            className={`form-input ${fieldErrors.password ? "form-input-error" : ""}`}
                            placeholder="Min. 6 characters"
                        />
                        {fieldErrors.password && <span className="login-field-error">{fieldErrors.password}</span>}
                    </div>
                    <button type="submit" className="login-button">
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
