# AuthContext Usage Guide

## Overview

The AuthContext provides comprehensive authentication management for the Shovel Heroes application, including:

- JWT token management (access + refresh tokens)
- Automatic token refresh before expiry
- Session persistence via localStorage
- 401 error handling with automatic retry
- Login, logout, and registration flows

## Setup

### 1. Wrap your app with AuthProvider

```jsx
// main.jsx or App.jsx
import { AuthProvider } from './contexts/AuthContext.jsx';

function App() {
  return (
    <AuthProvider>
      <YourAppContent />
    </AuthProvider>
  );
}
```

### 2. Use the useAuth hook in components

```jsx
import { useAuth } from './contexts/AuthContext.jsx';

function LoginPage() {
  const { login, isLoading, isAuthenticated } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login({
        email: 'user@example.com',
        password: 'password123'
      });
      // Redirect to dashboard or home
    } catch (error) {
      console.error('Login failed:', error);
      // Show error message
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {/* Login form fields */}
    </form>
  );
}
```

## API Reference

### Context Values

```typescript
{
  // State
  user: {
    id: string,
    email: string,
    role: string,
    phone_number: string | null
  } | null,
  accessToken: string | null,
  refreshToken: string | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  isRefreshing: boolean,

  // Functions
  login: (credentials: { email: string, password: string }) => Promise<Object>,
  logout: () => Promise<void>,
  register: (data: { email: string, password: string, phone_number?: string }) => Promise<Object>,
  refreshAccessToken: () => Promise<boolean>,
  checkAuth: () => Promise<void>
}
```

### Functions

#### login(credentials)

Authenticates user with email and password.

```jsx
const { login } = useAuth();

try {
  const response = await login({
    email: 'user@example.com',
    password: 'securePassword123'
  });
  console.log('Login successful:', response);
} catch (error) {
  console.error('Login failed:', error.message);
}
```

#### register(data)

Creates a new user account.

```jsx
const { register } = useAuth();

try {
  const response = await register({
    email: 'newuser@example.com',
    password: 'securePassword123',
    phone_number: '+1234567890'
  });
  console.log('Registration successful:', response);
  // Auto-logged in if backend returns tokens
} catch (error) {
  console.error('Registration failed:', error.message);
}
```

#### logout()

Logs out current user and clears session.

```jsx
const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
  // Redirect to login page
};
```

#### refreshAccessToken()

Manually refresh the access token (usually automatic).

```jsx
const { refreshAccessToken } = useAuth();

const refreshed = await refreshAccessToken();
if (refreshed) {
  console.log('Token refreshed successfully');
}
```

## Usage Examples

### Protected Route

```jsx
import { useAuth } from './contexts/AuthContext.jsx';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Usage in routes
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

### User Profile Display

```jsx
import { useAuth } from './contexts/AuthContext.jsx';

function UserProfile() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div>
      <h2>Welcome, {user.email}</h2>
      <p>Role: {user.role}</p>
      <p>Phone: {user.phone_number || 'Not provided'}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Conditional Rendering

```jsx
import { useAuth } from './contexts/AuthContext.jsx';

function Navigation() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav>
      <a href="/">Home</a>
      {isAuthenticated ? (
        <>
          <a href="/dashboard">Dashboard</a>
          <span>Hello, {user.email}</span>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <>
          <a href="/login">Login</a>
          <a href="/register">Register</a>
        </>
      )}
    </nav>
  );
}
```

### Making Authenticated API Calls

The AuthContext automatically adds the `Authorization` header to all API requests. Just use the existing API methods:

```jsx
import { DisasterArea } from '../api/endpoints/disaster-areas.js';
import { useAuth } from './contexts/AuthContext.jsx';

function DisasterAreaList() {
  const { isAuthenticated } = useAuth();
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      // Authorization header is automatically added
      DisasterArea.list()
        .then(setAreas)
        .catch(console.error);
    }
  }, [isAuthenticated]);

  // ...
}
```

## Features

### 1. Automatic Token Refresh

Tokens are automatically refreshed 5 minutes before expiry. No manual intervention needed.

### 2. Session Persistence

Authentication state persists across page refreshes using localStorage.

### 3. 401 Error Handling

If an API call returns 401:
1. AuthContext attempts to refresh the token
2. If refresh succeeds, the original request is retried
3. If refresh fails, user is logged out

### 4. Security

- Tokens stored in localStorage (consider httpOnly cookies for production)
- JWT expiry validation
- Automatic cleanup on logout
- Secure token refresh mechanism

## Debugging

All auth operations log to console in development:

```
[Auth] Checking authentication status...
[Auth] Valid token found, restoring session
[Auth] Set Authorization header
[Auth] Scheduling token refresh in 55 minutes
[Auth] Login successful: { id: '123', email: 'user@example.com', ... }
```

## Backend Integration

The AuthContext expects these backend endpoints:

```typescript
// Login
POST /auth/login
Body: { email: string, password: string }
Response: {
  accessToken: string,
  refreshToken?: string,
  user: { id, email, role, phone_number }
}

// Register
POST /auth/register
Body: { email: string, password: string, phone_number?: string }
Response: {
  accessToken?: string,
  refreshToken?: string,
  user: { id, email, role, phone_number }
}

// Logout
POST /auth/logout
Response: void

// Refresh Token
POST /auth/refresh
Body: { refreshToken: string }
Response: { accessToken: string }

// Get Current User
GET /me
Headers: { Authorization: "Bearer <token>" }
Response: { id, email, role, phone_number }
```

## Migration Notes

If you're migrating from a previous auth system:

1. Remove old auth state management
2. Wrap app with `<AuthProvider>`
3. Replace auth hooks with `useAuth()`
4. Update API calls to use authenticated endpoints
5. Test token refresh flow
6. Test 401 error handling

## Troubleshooting

### Token not refreshing

Check console for refresh errors. Ensure refresh token endpoint is correct.

### 401 errors not handled

Verify that `setupAuthInterceptor` is called properly in useEffect.

### Session not persisting

Check localStorage permissions and ensure tokens are being saved.

### User data not updating

Call `checkAuth()` manually or refresh the page to sync with backend.
