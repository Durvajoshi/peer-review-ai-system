import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { Bar, Pie } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Toast, useToast } from "../components/Toast";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

// Global Chart settings for Light Theme
ChartJS.defaults.color = 'rgba(15, 23, 42, 0.7)';
ChartJS.defaults.font.family = "'Outfit', sans-serif";
ChartJS.defaults.scale.grid.color = 'rgba(15, 23, 42, 0.05)';

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const { toasts, addToast, removeToast } = useToast();

    const [employees, setEmployees] = useState([]);
    const [employeeId, setEmployeeId] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const [cycles, setCycles] = useState([]);
    const [exactReviews, setExactReviews] = useState(null);
    const [showReviews, setShowReviews] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [newCycle, setNewCycle] = useState({ name: "", start_date: "", end_date: "" });

    const [newEmployee, setNewEmployee] = useState({ name: "", email: "", role: "Employee", team: "", password: "" });
    const [empErrors, setEmpErrors] = useState({});

    const [resetPasswordData, setResetPasswordData] = useState({ employeeId: "", newPassword: "" });
    const [resetErrors, setResetErrors] = useState({});

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const empRes = await axios.get("http://localhost:5000/api/employees", {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                setEmployees(empRes.data);

                const cycleRes = await axios.get("http://localhost:5000/api/cycles", {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                setCycles(cycleRes.data);
            } catch (err) {
                console.error("Failed to fetch data", err);
            }
        };
        if (user?.token) {
            fetchInitialData();
        }
    }, [user]);

    const fetchAnalysis = async () => {
        if (!employeeId) return;
        try {
            const res = await axios.get(`http://localhost:5000/api/analysis/${employeeId}`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            if (res.data && res.data.message) {
                setAnalysis(null);
                addToast("info", res.data.message, "No Analysis Yet");
            } else {
                setAnalysis(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch analysis", err);
            setAnalysis(null);
            addToast("error", "Could not fetch the analysis report. Please try again.", "Analysis Failed");
        }
    };

    const fetchExactReviews = async () => {
        if (!employeeId) return;
        try {
            const res = await axios.get(`http://localhost:5000/api/reviews/employee/${employeeId}`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setExactReviews(res.data);
            setShowReviews(true);
        } catch (err) {
            console.error("Failed to fetch exact reviews", err);
            setExactReviews(null);
            addToast("error", "Could not load reviews for this employee.", "Error");
        }
    };

    const handleCreateCycle = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://localhost:5000/api/cycles", newCycle, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setCycles([res.data, ...cycles]);
            setNewCycle({ name: "", start_date: "", end_date: "" });
            addToast("success", "New review cycle has been created successfully!", "Cycle Created");
        } catch (err) {
            console.error(err);
            addToast("error", err.response?.data?.message || "Failed to create cycle. Please try again.", "Creation Failed");
        }
    };

    const toggleCycleStatus = async (id, currentStatus) => {
        try {
            const isActive = currentStatus === 'active';
            const res = await axios.patch(`http://localhost:5000/api/cycles/${id}/status`, { is_active: !isActive }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setCycles(cycles.map(c => c.id === id ? res.data : c));
            addToast("success", `Cycle has been ${isActive ? "closed" : "activated"} successfully.`, "Status Updated");
        } catch (err) {
            console.error(err);
            addToast("error", "Failed to update cycle status. Please try again.", "Update Failed");
        }
    };

    // Validation for Add Employee
    const validateEmployee = () => {
        const errors = {};
        if (!newEmployee.name.trim()) errors.name = "Name is required.";
        else if (newEmployee.name.trim().length < 2) errors.name = "Name must be at least 2 characters.";

        if (!newEmployee.email.trim()) errors.email = "Email is required.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmployee.email)) errors.email = "Enter a valid email address.";

        if (!newEmployee.team.trim()) errors.team = "Team name is required.";
        else if (newEmployee.team.trim().length < 2) errors.team = "Team must be at least 2 characters.";

        if (!newEmployee.password) errors.password = "Password is required.";
        else if (newEmployee.password.length < 6) errors.password = "Password must be at least 6 characters.";
        else if (!/[A-Za-z]/.test(newEmployee.password)) errors.password = "Password must contain at least one letter.";

        return errors;
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        const errors = validateEmployee();
        if (Object.keys(errors).length > 0) {
            setEmpErrors(errors);
            return;
        }
        setEmpErrors({});
        try {
            const res = await axios.post("http://localhost:5000/api/employees", newEmployee, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setEmployees([...employees, res.data]);
            setNewEmployee({ name: "", email: "", role: "Employee", team: "", password: "" });
            addToast("success", `${res.data.name || "Employee"} has been added to the system!`, "Employee Created");
        } catch (err) {
            console.error(err);
            addToast("error", err.response?.data?.message || "Failed to create employee.", "Error");
        }
    };

    // Validation for Reset Password
    const validateReset = () => {
        const errors = {};
        if (!resetPasswordData.employeeId) errors.employeeId = "Please select an employee.";
        if (!resetPasswordData.newPassword) errors.newPassword = "New password is required.";
        else if (resetPasswordData.newPassword.length < 6) errors.newPassword = "Password must be at least 6 characters.";
        else if (!/[A-Za-z]/.test(resetPasswordData.newPassword)) errors.newPassword = "Password must contain at least one letter.";
        return errors;
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const errors = validateReset();
        if (Object.keys(errors).length > 0) {
            setResetErrors(errors);
            return;
        }
        setResetErrors({});
        try {
            await axios.patch(`http://localhost:5000/api/employees/${resetPasswordData.employeeId}/password`, { new_password: resetPasswordData.newPassword }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setResetPasswordData({ employeeId: "", newPassword: "" });
            addToast("success", "The employee's password has been updated successfully.", "Password Reset");
        } catch (err) {
            console.error(err);
            addToast("error", err.response?.data?.message || "Failed to reset password.", "Reset Failed");
        }
    };

    // Chart Data Preparation
    const scoreData = {
        labels: ['Sentiment Score'],
        datasets: [
            {
                label: 'Analysis Score (-1 to 1)',
                data: analysis ? [analysis.sentiment_score] : [0],
                backgroundColor: analysis && analysis.sentiment_score > 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)',
                borderColor: analysis && analysis.sentiment_score > 0 ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)',
                borderWidth: 1,
            },
        ],
    };

    const skillsData = {
        labels: analysis?.skills ? analysis.skills : [],
        datasets: [
            {
                label: 'Skills Evaluated',
                data: analysis?.skills ? analysis.skills.map(() => 1) : [],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                ],
            },
        ],
    };

    return (
        <div className="admin-dashboard">
            <Toast toasts={toasts} removeToast={removeToast} />

            <div className="dashboard-header">
                <h2>Admin Analytics Dashboard</h2>
                <div className="admin-profile">
                    <span className="admin-name">Welcome {user?.name} ,</span>
                    <button onClick={logout} className="btn btn-danger">Logout</button>
                </div>
            </div>

            <div className="dashboard-grid">
                {/* Employee Analysis Section */}
                <div className="card">
                    <h3>Report Analysis</h3>
                    <div className="controls-row">
                        <select
                            value={employeeId}
                            onChange={e => {
                                setEmployeeId(e.target.value);
                                setAnalysis(null);
                                setExactReviews(null);
                                setShowReviews(false);
                                setStartDate("");
                                setEndDate("");
                            }}
                            className="form-control"
                            style={{ flex: 1 }}
                        >
                            <option value="">Select Employee to analyze...</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name} ({emp.team})</option>
                            ))}
                        </select>
                        <button onClick={fetchAnalysis} className="btn btn-primary">
                            Get Analysis
                        </button>
                        <button onClick={fetchExactReviews} className="btn btn-secondary">
                            View Exact Reviews
                        </button>
                    </div>

                    {showReviews && exactReviews ? (
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <h4>Exact Reviews ({exactReviews.filter(r => (!startDate || new Date(r.created_at) >= new Date(startDate)) && (!endDate || new Date(r.created_at) <= new Date(endDate))).length})</h4>
                                <button onClick={() => setShowReviews(false)} className="btn btn-danger" style={{ padding: "4px 8px", fontSize: "12px" }}>Close Reviews</button>
                            </div>

                            <div className="filter-bar">
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Start Date</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-control" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">End Date</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-control" />
                                </div>
                                <div style={{ display: "flex", alignItems: "flex-end" }}>
                                    <button onClick={() => { setStartDate(""); setEndDate(""); }} className="btn btn-secondary">Clear</button>
                                </div>
                            </div>

                            {exactReviews.filter(r => (!startDate || new Date(r.created_at) >= new Date(startDate)) && (!endDate || new Date(r.created_at) <= new Date(endDate))).length === 0 ? <div className="empty-state">No exact reviews available for the selected dates.</div> : (
                                <div className="review-list">
                                    {exactReviews.filter(r => (!startDate || new Date(r.created_at) >= new Date(startDate)) && (!endDate || new Date(r.created_at) <= new Date(endDate))).map(r => (
                                        <div key={r.id} className="review-card">
                                            <div className="review-header">
                                                <span>Review by {r.reviewer_name}</span>
                                                <span className="review-meta">{r.cycle_name} - {new Date(r.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="review-ratings">
                                                <div className="rating-item">
                                                    <span>Collaboration:</span> <span className="rating-score">{r.collaboration_rating}/5</span>
                                                </div>
                                                <div className="rating-item">
                                                    <span>Communication:</span> <span className="rating-score">{r.communication_rating}/5</span>
                                                </div>
                                                <div className="rating-item">
                                                    <span>Technical:</span> <span className="rating-score">{r.technical_rating}/5</span>
                                                </div>
                                                <div className="rating-item">
                                                    <span>Learning:</span> <span className="rating-score">{r.learning_rating}/5</span>
                                                </div>
                                            </div>
                                            <div className="review-text">
                                                <strong>Review:</strong><br />{r.review_text}
                                            </div>
                                            <div className="review-text">
                                                <strong>Suggested Improvements:</strong><br />{r.improvement_text}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}

                    {analysis ? (
                        <div>
                            <div className="ai-summary">
                                <h4>AI Summary</h4>
                                <p>{analysis.summary}</p>
                            </div>

                            <div className="analysis-grid">
                                <div className="list-card strengths">
                                    <h4>Strengths</h4>
                                    <ul className="custom-list">
                                        {analysis.strengths && analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                                <div className="list-card weaknesses">
                                    <h4>Weaknesses</h4>
                                    <ul className="custom-list">
                                        {analysis.weaknesses && analysis.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                                    </ul>
                                </div>
                            </div>

                            <div className="analysis-grid">
                                <div className="chart-container">
                                    <h4>Sentiment Score</h4>
                                    <Bar
                                        data={scoreData}
                                        options={{
                                            indexAxis: 'y',
                                            scales: { x: { min: -1, max: 1 } },
                                            plugins: { legend: { display: false } }
                                        }}
                                    />
                                </div>
                                <div className="chart-container">
                                    <h4>Skills Overview</h4>
                                    {analysis.skills && analysis.skills.length > 0 ? (
                                        <div style={{ maxWidth: 200, margin: "0 auto" }}>
                                            <Pie data={skillsData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                                        </div>
                                    ) : (
                                        <div className="empty-state">No skills extracted.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            Select an employee and click "Get Analysis" to fetch their report.
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* Cycle Management Section */}
                    <div className="card scrollable">
                        <h3>Review Cycles</h3>

                        <form onSubmit={handleCreateCycle} style={{ marginBottom: "30px" }}>
                            <h4>Create New Cycle</h4>
                            <div className="form-group">
                                <input
                                    type="text"
                                    placeholder="e.g., Q1 2026"
                                    value={newCycle.name}
                                    onChange={e => setNewCycle({ ...newCycle, name: e.target.value })}
                                    required
                                    className="form-control"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Start Date</label>
                                <input type="date" value={newCycle.start_date} onChange={e => setNewCycle({ ...newCycle, start_date: e.target.value })} required className="form-control" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Date</label>
                                <input type="date" value={newCycle.end_date} onChange={e => setNewCycle({ ...newCycle, end_date: e.target.value })} required className="form-control" />
                            </div>
                            <button type="submit" className="btn btn-success" style={{ width: "100%" }}>Create Cycle</button>
                        </form>

                        <h4>Manage Cycles</h4>
                        {cycles.length === 0 ? <div className="empty-state" style={{ padding: "20px" }}>No cycles found.</div> : (
                            <div className="cycle-list">
                                {cycles.map(c => (
                                    <div key={c.id} className={`cycle-item ${c.status === 'active' ? 'active' : 'inactive'}`}>
                                        <div className="cycle-name">{c.cycle_name}</div>
                                        <div className="cycle-dates">
                                            {new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()}
                                        </div>
                                        <button
                                            onClick={() => toggleCycleStatus(c.id, c.status)}
                                            className={`btn ${c.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                                            style={{ marginTop: "10px", fontSize: "12px", padding: "6px 12px" }}
                                        >
                                            {c.status === 'active' ? "Close Cycle" : "Activate Cycle"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Employee Management Section */}
                    <div className="card scrollable">
                        <h3>Employee Management</h3>

                        <form onSubmit={handleAddEmployee} style={{ marginBottom: "30px" }} noValidate autoComplete="off">
                            <h4>Add New Employee</h4>
                            <div className="form-group">
                                <input
                                    type="text"
                                    placeholder="Full name (min. 2 characters)"
                                    value={newEmployee.name}
                                    onChange={e => { setNewEmployee({ ...newEmployee, name: e.target.value }); if (empErrors.name) setEmpErrors(prev => ({ ...prev, name: "" })); }}
                                    className={`form-control ${empErrors.name ? "input-error" : ""}`}
                                />
                                {empErrors.name && <span className="field-error">{empErrors.name}</span>}
                            </div>
                            <div className="form-group">
                                <input
                                    type="email"
                                    placeholder="e.g., john.smith@company.com"
                                    value={newEmployee.email}
                                    onChange={e => { setNewEmployee({ ...newEmployee, email: e.target.value }); if (empErrors.email) setEmpErrors(prev => ({ ...prev, email: "" })); }}
                                    className={`form-control ${empErrors.email ? "input-error" : ""}`}
                                />
                                {empErrors.email && <span className="field-error">{empErrors.email}</span>}
                            </div>
                            <div className="form-group">
                                <input
                                    type="text"
                                    placeholder="e.g., Engineering, Design (min. 2 characters)"
                                    value={newEmployee.team}
                                    onChange={e => { setNewEmployee({ ...newEmployee, team: e.target.value }); if (empErrors.team) setEmpErrors(prev => ({ ...prev, team: "" })); }}
                                    className={`form-control ${empErrors.team ? "input-error" : ""}`}
                                />
                                {empErrors.team && <span className="field-error">{empErrors.team}</span>}
                            </div>
                            <div className="form-group">
                                <select value={newEmployee.role} onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })} className="form-control">
                                    <option value="Employee">Employee</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <input
                                    type="password"
                                    placeholder="Password Min. 6 characters, must include a letter"
                                    value={newEmployee.password}
                                    onChange={e => { setNewEmployee({ ...newEmployee, password: e.target.value }); if (empErrors.password) setEmpErrors(prev => ({ ...prev, password: "" })); }}
                                    className={`form-control ${empErrors.password ? "input-error" : ""}`}
                                    autoComplete="new-password"
                                />
                                {empErrors.password && <span className="field-error">{empErrors.password}</span>}
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Create Employee</button>
                        </form>

                        <form onSubmit={handleResetPassword} noValidate autoComplete="off">
                            <h4>Reset Password</h4>
                            <div className="form-group">
                                <select
                                    value={resetPasswordData.employeeId}
                                    onChange={e => { setResetPasswordData({ ...resetPasswordData, employeeId: e.target.value }); if (resetErrors.employeeId) setResetErrors(prev => ({ ...prev, employeeId: "" })); }}
                                    className={`form-control ${resetErrors.employeeId ? "input-error" : ""}`}
                                >
                                    <option value="">Select employee to reset password...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                                {resetErrors.employeeId && <span className="field-error">{resetErrors.employeeId}</span>}
                            </div>
                            <div className="form-group">
                                <input
                                    type="password"
                                    placeholder="New password (min. 6 characters, must include a letter)"
                                    value={resetPasswordData.newPassword}
                                    onChange={e => { setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value }); if (resetErrors.newPassword) setResetErrors(prev => ({ ...prev, newPassword: "" })); }}
                                    className={`form-control ${resetErrors.newPassword ? "input-error" : ""}`}
                                    autoComplete="new-password"
                                />
                                {resetErrors.newPassword && <span className="field-error">{resetErrors.newPassword}</span>}
                            </div>
                            <button type="submit" className="btn btn-warning" style={{ width: "100%", color: "#2d3748" }}>Update Password</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}