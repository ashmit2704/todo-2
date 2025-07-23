import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import './Login.css';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const [formData, setFormData] = useState({
        email: "",
        password: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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

    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        setGeneralError('');
        setSuccessMessage('');
        
        try {
            const response = await fetch("https://todo-2-jnyc.onrender.com/auth/login", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(formData),
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                console.log("Login successful:", data);
                setSuccessMessage(data.message);
                setFormData({
                    email: '',
                    password: ''
                });

                // Store token or user data if needed
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                }

                setTimeout(() => {
                    window.location.href = '/'; // Redirect to dashboard or home
                }, 2000);
                
            } else {
                console.log("Login failed:", data);
                setFormData(prev => ({
                  ...prev,
                  password: ''
                }));
                
                if (data.errors && typeof data.errors === 'object' && Object.keys(data.errors).length > 0) {
                    // Check if errors is an object with field-specific errors
                    setErrors(data.errors);
                    
                    // If there's a general error, show it separately
                    if (data.errors.general) {
                        setGeneralError(data.errors.general);
                    }
                } else {
                    // Fallback to general error message
                    setGeneralError(data.message || 'Login failed. Please check your credentials.');
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
    <div className="container">
      <div className="form-wrapper">
        <div className="login-logo">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
        </div>
        <h1 className="title">Login</h1>
        <p className="subtitle">Organize your tasks efficiently</p>

        <h2 className="welcome">Welcome Back</h2>
        <p className="signin-instruction">Sign in to continue managing your tasks</p>

        {successMessage && (
            <div className="alert alert-success">
                <span className="alert-icon">✓</span>
                {successMessage}
            </div>
        )}
        {generalError && (
            <div className="alert alert-error">
                <span className="alert-icon">✗</span>
                {generalError}
            </div>
        )}

        <form className="signin-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <div className={`input-container ${errors.email ? 'error' : ''}`}>
              <Mail className="input-icon" size={20} />
              <input 
                type="email" 
                id="email" 
                name="email" 
                placeholder="Enter your email" 
                required
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className={`input-container ${errors.password ? 'error' : ''}`}>
              <Lock className="input-icon" size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                id="password" 
                name="password" 
                placeholder="Enter your password" 
                required
                value={formData.password}
                onChange={handleInputChange}
              />
              <button 
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <button type="submit" className="signin-button">
            Sign In
            <span className="arrow">→</span>
          </button>
        </form>

        <p className="signup-invitation">
            Don't have an account? <a onClick={() => navigate('/register')} className="signup-link">Sign up for free</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
