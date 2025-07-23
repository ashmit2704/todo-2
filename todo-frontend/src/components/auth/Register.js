import { useState } from 'react';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import './Register.css';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const navigate = useNavigate();
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear specific field error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
        
        // Clear general error
        if (generalError) {
            setGeneralError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        setGeneralError('');
        setSuccessMessage('');
        
        try {
            const response = await fetch("https://todo-2-jnyc.onrender.com/auth/register", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(formData),
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                console.log("Registration successful:", data);
                setSuccessMessage(data.message);
                setFormData({
                    fullName: '',
                    email: '',
                    password: '',
                    confirmPassword: ''
                });
                setAgreeToTerms(false);

                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                
            } else {
                console.log("Registration failed:", data);
                
                if (data.errors) {
                    setErrors(data.errors);
                } else {
                    setGeneralError(data.message || 'Registration failed. Please try again.');
                }
            }
        } catch (error) {
            console.error("Network error:", error);
            setGeneralError('Network error. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                {/* Header */}
                <div className="register-header">
                    <div className="register-logo">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    </div>
                    <h2 className="register-title">Create Account</h2>
                    <p className="register-subtitle">
                        Join TaskFlow and organize your projects efficiently
                    </p>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="alert alert-success">
                        <span className="alert-icon">✓</span>
                        {successMessage}
                    </div>
                )}

                {/* General Error Message */}
                {generalError && (
                    <div className="alert alert-error">
                        <span className="alert-icon">✗</span>
                        {generalError}
                    </div>
                )}

                {/* Form */}
                <div className="register-form">
                    {/* Full Name */}
                    <div className="form-group">
                        <label htmlFor="fullName" className="form-label">
                            Full Name
                        </label>
                        <div className={`input-wrapper ${errors.fullName ? 'error' : ''}`}>
                            <div className="input-icon">
                                <User />
                            </div>
                            <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                required
                                className="form-input"
                                placeholder="Enter your full name"
                                value={formData.fullName}
                                onChange={handleInputChange}
                            />
                        </div>
                        {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                    </div>

                    {/* Email Address */}
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            Email Address
                        </label>
                        <div className={`input-wrapper ${errors.email ? 'error' : ''}`}>
                            <div className="input-icon">
                                <Mail />
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="form-input"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                        </div>
                        {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            Password
                        </label>
                        <div className={`input-wrapper password-wrapper ${errors.password ? 'error' : ''}`}>
                            <div className="input-icon">
                                <Lock />
                            </div>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                style={showPassword ? {fontSize: '14px'} : {}}
                                className="form-input"
                                placeholder="Create a password"
                                value={formData.password}
                                onChange={handleInputChange}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff /> : <Eye />}
                            </button>
                        </div>
                        {errors.password && <span className="error-message">{errors.password}</span>}
                        <p className="password-hint">
                            Password must be at least 8 characters with uppercase, lowercase, number and special character
                        </p>
                    </div>

                    {/* Confirm Password */}
                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">
                            Confirm Password
                        </label>
                        <div className={`input-wrapper ${errors.confirmPassword ? 'error' : ''}`}>
                            <div className="input-icon">
                                <Lock />
                            </div>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                className="form-input"
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                            />
                        </div>
                        {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                    </div>

                    {/* Terms and Conditions */}
                    <div className="checkbox-wrapper">
                        <input
                            id="agreeToTerms"
                            name="agreeToTerms"
                            type="checkbox"
                            checked={agreeToTerms}
                            onChange={(e) => setAgreeToTerms(e.target.checked)}
                            className="checkbox-input"
                        />
                        <label htmlFor="agreeToTerms" className="checkbox-label">
                            I agree to the{' '}
                            <a href="#" onClick={(e) => e.preventDefault()}>
                                Terms of Service
                            </a>{' '}
                            and{' '}
                            <a href="#" onClick={(e) => e.preventDefault()}>
                                Privacy Policy
                            </a>
                        </label>
                    </div>

                    {/* Create Account Button */}
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className={`create-account-btn ${loading ? 'loading' : ''}`}
                        disabled={!agreeToTerms || loading}
                    >
                        {loading ? (
                            <>
                                <div className="spinner"></div>
                                Creating Account...
                            </>
                        ) : (
                            <>
                                <User className="btn-icon" />
                                Create Account
                            </>
                        )}
                    </button>
                </div>

                {/* Sign In Link */}
                <div className="signin-link">
                    <p>
                        Already have an account?{' '}
                        <a onClick={() => navigate('/login')}>
                            Sign in here
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
