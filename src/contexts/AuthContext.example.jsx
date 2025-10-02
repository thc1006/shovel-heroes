/**
 * AuthContext Usage Examples
 *
 * This file demonstrates various ways to use the AuthContext
 * in your React components.
 */

import { useAuth } from './AuthContext.jsx';
import { useState } from 'react';

/**
 * Example 1: Login Form Component
 */
export function LoginForm() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await login({ email, password });
      // Redirect to dashboard after successful login
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>

      {error && <div className="error">{error}</div>}

      <div>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password">Password:</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

/**
 * Example 2: Registration Form Component
 */
export function RegisterForm() {
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phone_number: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        phone_number: formData.phone_number || undefined
      });

      setSuccess(true);
      // Redirect or show success message
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  if (success) {
    return <div className="success">Registration successful! Redirecting...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>

      {error && <div className="error">{error}</div>}

      <div>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="phone_number">Phone Number (optional):</label>
        <input
          id="phone_number"
          name="phone_number"
          type="tel"
          value={formData.phone_number}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password">Password:</label>
        <input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword">Confirm Password:</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          disabled={isLoading}
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}

/**
 * Example 3: User Profile Component
 */
export function UserProfile() {
  const { user, logout, isLoading } = useAuth();

  if (!user) {
    return <div>Please log in to view your profile</div>;
  }

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
      window.location.href = '/login';
    }
  };

  return (
    <div className="user-profile">
      <h2>User Profile</h2>

      <div className="profile-info">
        <div>
          <strong>Email:</strong> {user.email}
        </div>
        <div>
          <strong>Role:</strong> {user.role}
        </div>
        <div>
          <strong>Phone:</strong> {user.phone_number || 'Not provided'}
        </div>
        <div>
          <strong>User ID:</strong> {user.id}
        </div>
      </div>

      <button onClick={handleLogout} disabled={isLoading}>
        Logout
      </button>
    </div>
  );
}

/**
 * Example 4: Protected Route Component
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login
    window.location.href = '/login';
    return null;
  }

  return children;
}

/**
 * Example 5: Navigation Bar with Auth Status
 */
export function NavigationBar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <a href="/">Shovel Heroes</a>
      </div>

      <div className="nav-links">
        <a href="/">Home</a>
        <a href="/disaster-areas">Disaster Areas</a>

        {isAuthenticated ? (
          <>
            <a href="/dashboard">Dashboard</a>
            <a href="/profile">Profile</a>
            <span className="user-email">{user?.email}</span>
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </>
        ) : (
          <>
            <a href="/login">Login</a>
            <a href="/register">Register</a>
          </>
        )}
      </div>
    </nav>
  );
}

/**
 * Example 6: Role-Based Access Control
 */
export function AdminPanel() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in to access this page</div>;
  }

  if (user.role !== 'admin') {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <h1>Admin Panel</h1>
      <p>Welcome, {user.email}</p>
      {/* Admin-only content */}
    </div>
  );
}

/**
 * Example 7: Authenticated API Call in Component
 */
export function DisasterAreasList() {
  const { isAuthenticated } = useAuth();
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAreas() {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        // Authorization header is automatically added by AuthContext
        const data = await DisasterArea.list();
        setAreas(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAreas();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <div>Please log in to view disaster areas</div>;
  }

  if (loading) {
    return <div>Loading disaster areas...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="disaster-areas-list">
      <h2>Disaster Areas</h2>
      <ul>
        {areas.map(area => (
          <li key={area.id}>
            {area.name} - {area.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example 8: Loading State During Auth Check
 */
export function AppRoot() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading application...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <NavigationBar />
      {/* Your app content */}
    </div>
  );
}
