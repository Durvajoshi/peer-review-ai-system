import React, { useEffect, useState } from "react";
import "./Toast.css";

export function Toast({ toasts, removeToast }) {
    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
            ))}
        </div>
    );
}

function ToastItem({ toast, removeToast }) {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(() => removeToast(toast.id), 400);
        }, toast.duration || 4000);
        return () => clearTimeout(timer);
    }, [toast, removeToast]);

    const icons = {
        success: "✓",
        error: "✕",
        info: "ℹ",
        warning: "⚠",
    };

    return (
        <div className={`toast toast-${toast.type} ${exiting ? "toast-exit" : "toast-enter"}`}>
            <div className="toast-icon">{icons[toast.type] || "ℹ"}</div>
            <div className="toast-body">
                {toast.title && <div className="toast-title">{toast.title}</div>}
                <div className="toast-message">{toast.message}</div>
            </div>
            <button className="toast-close" onClick={() => { setExiting(true); setTimeout(() => removeToast(toast.id), 400); }}>×</button>
        </div>
    );
}

// Hook
let _addToast = null;
export function useToast() {
    const [toasts, setToasts] = useState([]);

    _addToast = (type, message, title, duration) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, message, title, duration }]);
    };

    const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
    const addToast = (type, message, title, duration) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, message, title, duration }]);
    };

    return { toasts, addToast, removeToast };
}
