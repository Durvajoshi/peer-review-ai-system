import React, { useState, useEffect } from "react";
import "./ReviewPage.css";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

export default function ReviewPage() {
    const { user, logout } = useAuth();
    const [cycles, setCycles] = useState([]);
    const [pendingEmployees, setPendingEmployees] = useState([]);
    const [currentCycleId, setCurrentCycleId] = useState("");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        collaboration_rating: 5,
        communication_rating: 5,
        technical_rating: 5,
        learning_rating: 5,
        review_text: "",
        improvement_text: ""
    });

    useEffect(() => {
        const fetchCycles = async () => {
            try {
                const cycleRes = await axios.get("http://localhost:5000/api/cycles/active", {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                setCycles(cycleRes.data);

                if (cycleRes.data.length > 0) {
                    setCurrentCycleId(cycleRes.data[0].id);
                }
            } catch (err) {
                console.error("Error fetching active cycles:", err);
                setError("Failed to load active cycles.");
            }
        };
        if (user?.token) {
            fetchCycles();
        }
    }, [user]);

    useEffect(() => {
        const fetchPendingEmployees = async () => {
            if (!currentCycleId) return;
            try {
                const empRes = await axios.get(`http://localhost:5000/api/reviews/pending-employees/${currentCycleId}`, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                setPendingEmployees(empRes.data);
                if (empRes.data.length > 0) {
                    setSelectedEmployeeId(empRes.data[0].id);
                } else {
                    setSelectedEmployeeId("");
                }
            } catch (err) {
                console.error("Error fetching pending employees:", err);
                setError("Failed to load colleagues for review.");
            }
        };
        if (user?.token && currentCycleId) {
            fetchPendingEmployees();
        }
    }, [currentCycleId, user]);

    // Automatically manage selection when pending list changes
    useEffect(() => {
        if (pendingEmployees.length > 0) {
            const stillInList = pendingEmployees.some(emp => emp.id === selectedEmployeeId);
            if (!stillInList || !selectedEmployeeId) {
                setSelectedEmployeeId(pendingEmployees[0].id);
            }
        } else {
            setSelectedEmployeeId("");
        }
    }, [pendingEmployees, selectedEmployeeId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const submit = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");

        if (pendingEmployees.length === 0 || !currentCycleId || !selectedEmployeeId) {
            setError("Please select a colleague to review.");
            return;
        }

        const selectedEmployee = pendingEmployees.find(emp => emp.id === selectedEmployeeId);
        setLoading(true);

        try {
            await axios.post(
                "http://localhost:5000/api/reviews/submit",
                { ...form, cycle_id: currentCycleId, reviewee_id: selectedEmployeeId, reviewer_id: user.id },
                { headers: { Authorization: `Bearer ${user?.token}` } }
            );

            setMessage(`Review for ${selectedEmployee?.name || 'colleague'} submitted successfully!`);

            // Remove the reviewed employee from the list immediately
            setPendingEmployees(prev => prev.filter(emp => emp.id !== selectedEmployeeId));

            // Reset text fields but keep ratings 
            setForm(prev => ({
                ...prev,
                review_text: "",
                improvement_text: ""
            }));
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.response?.data?.detail || "Error submitting review.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="review-container">
            <div className="review-wrapper">
                <div className="review-header">
                    <div>
                        <h2 className="review-title">Peer Review Submission</h2>
                        <div className="welcome-text">Welcome {user?.name},</div>
                    </div>
                    <button onClick={logout} className="btn btn-danger">Logout</button>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}

                <div className="card">
                    <form onSubmit={submit}>
                        <div className="form-group">
                            <label className="form-label">Active Cycle</label>
                            <select value={currentCycleId} onChange={(e) => setCurrentCycleId(e.target.value)} required className="form-control">
                                <option value="">--Select Cycle--</option>
                                {cycles.map(c => (
                                    <option key={c.id} value={c.id}>{c.cycle_name}</option>
                                ))}
                            </select>
                        </div>

                        {currentCycleId && pendingEmployees.length === 0 ? (
                            <div className="success-state">
                                <div className="success-icon">🎉</div>
                                <h3>All Caught Up!</h3>
                                <p>You have submitted reviews for all your colleagues in this cycle.<br />Great job fostering team growth!</p>
                            </div>
                        ) : currentCycleId && pendingEmployees.length > 0 ? (
                            <>
                                <div className="review-target-card">
                                    <div className="target-info" style={{ flex: 1 }}>
                                        <label className="form-label" style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '700', color: '#4f46e5' }}>Select Employee to Review</label>
                                        <select
                                            value={selectedEmployeeId}
                                            disabled={loading}
                                            onChange={(e) => {
                                                setSelectedEmployeeId(e.target.value);
                                                // Clear form text when switching to avoid accidental carryover
                                                setForm(prev => ({
                                                    ...prev,
                                                    review_text: "",
                                                    improvement_text: ""
                                                }));
                                            }}
                                            required
                                            className="form-control select-with-arrow"
                                            style={{ fontSize: '18px', fontWeight: '600', height: 'auto' }}
                                        >
                                            {pendingEmployees.map(emp => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.name} — {emp.team}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="rating-grid">
                                    <div className="rating-input">
                                        <div className="rating-header">
                                            <label className="form-label">Collaboration Rating</label>
                                            <div className="rating-value">{form.collaboration_rating}</div>
                                        </div>
                                        <input type="range" name="collaboration_rating" min="1" max="5" step="1" value={form.collaboration_rating} onChange={handleChange} required className="slider" />
                                        <div className="slider-labels">
                                            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                        </div>
                                    </div>
                                    <div className="rating-input">
                                        <div className="rating-header">
                                            <label className="form-label">Communication Rating</label>
                                            <div className="rating-value">{form.communication_rating}</div>
                                        </div>
                                        <input type="range" name="communication_rating" min="1" max="5" step="1" value={form.communication_rating} onChange={handleChange} required className="slider" />
                                        <div className="slider-labels">
                                            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                        </div>
                                    </div>
                                    <div className="rating-input">
                                        <div className="rating-header">
                                            <label className="form-label">Technical Rating</label>
                                            <div className="rating-value">{form.technical_rating}</div>
                                        </div>
                                        <input type="range" name="technical_rating" min="1" max="5" step="1" value={form.technical_rating} onChange={handleChange} required className="slider" />
                                        <div className="slider-labels">
                                            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                        </div>
                                    </div>
                                    <div className="rating-input">
                                        <div className="rating-header">
                                            <label className="form-label">Learning Rating</label>
                                            <div className="rating-value">{form.learning_rating}</div>
                                        </div>
                                        <input type="range" name="learning_rating" min="1" max="5" step="1" value={form.learning_rating} onChange={handleChange} required className="slider" />
                                        <div className="slider-labels">
                                            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Collaboration Feedback & General Review</label>
                                    <textarea name="review_text" value={form.review_text} onChange={handleChange} required className="form-control" placeholder="Provide detailed feedback..." />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Improvement Suggestions</label>
                                    <textarea name="improvement_text" value={form.improvement_text} onChange={handleChange} required className="form-control" placeholder="What could they improve?" />
                                </div>

                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? "Submitting..." : "Submit Review"}
                                </button>
                            </>
                        ) : null}
                    </form>
                </div>
            </div>
        </div>
    );
}