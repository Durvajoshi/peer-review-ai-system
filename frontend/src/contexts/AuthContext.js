import React, { createContext, useState, useEffect, useContext } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                // Check if token is expired
                if (decodedToken.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    setUser({ ...decodedToken, token });
                    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
                }
            } catch (error) {
                console.error("Invalid token");
                logout();
            }
        }
        setLoading(false);
    }, []);

    const login = (token, userData) => {
        localStorage.setItem("token", token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        // Use user data from decoded token to ensure consistency
        const decodedToken = jwtDecode(token);
        setUser({ ...decodedToken, token });
    };

    const logout = () => {
        localStorage.removeItem("token");
        delete axios.defaults.headers.common["Authorization"];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
