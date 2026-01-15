# Authentication in PocketBase

## Overview

PocketBase provides comprehensive authentication features including:
- Email/password authentication
- OAuth2 integration (Google, GitHub, etc.)
- Magic link authentication
- Email verification
- Password reset
- JWT token management
- Role-based access control

## Auth Collections

User accounts are managed through **Auth Collections**. Unlike base collections, auth collections:
- Have built-in authentication fields
- Support OAuth2 providers
- Provide password management
- Include email verification
- Generate JWT tokens

### Built-in Auth Fields

```json
{
  "id": "string (unique)",
  "email": "string (required, unique)",
  "password": "string (hashed)",
  "passwordConfirm": "string (validation only)",
  "emailVisibility": "boolean (default: true)",
  "verified": "boolean (default: false)",
  "created": "datetime (autodate)",
  "updated": "datetime (autodate)",
  "lastResetSentAt": "datetime",
  "verificationToken": "string"
}
```

**Note:** Password fields are never returned in API responses for security.

## Registration

### Email/Password

```javascript
// Register new user
const authData = await pb.collection('users').create({
  email: 'user@example.com',
  password: 'password123',
  passwordConfirm: 'password123',
  name: 'John Doe'  // custom field
});

// Returns:
// {
//   token: "JWT_TOKEN",
//   user: { ...user data... }
// }
```

**Features:**
- Automatic password hashing
- Email uniqueness validation
- Email verification (if enabled)
- Custom fields supported

### OAuth2 Registration/Login

```javascript
// With OAuth2 code (from provider redirect)
const authData = await pb.collection('users').authWithOAuth2({
  provider: 'google',
  code: 'OAUTH2_CODE_FROM_GOOGLE'
});

// With existing access token
const authData = await pb.collection('users').authWithOAuth2({
  provider: 'github',
  accessToken: 'USER_ACCESS_TOKEN'
});
```

**Supported Providers:**
- Google
- GitHub
- GitLab
- Discord
- Facebook
- Microsoft
- Spotify
- Twitch
- Discord
- Twitter/X

**Custom OAuth2 Configuration:**
1. Go to Auth Collections → OAuth2 providers
2. Add provider with client ID/secret
3. Configure redirect URL
4. Enable provider

### Magic Link Authentication

```javascript
// Send magic link
await pb.collection('users').requestPasswordReset('user@example.com');

// User clicks link (URL contains token)
// Reset password (returns 204 on success)
await pb.collection('users').confirmPasswordReset(
  'RESET_TOKEN',
  'newPassword123',
  'newPassword123'
);

// After confirming, prompt the user to sign in again with the new password.
```

## Login

### Standard Login

```javascript
// Email and password
const authData = await pb.collection('users').authWithPassword(
  'user@example.com',
  'password123'
);

// Access token and user data
console.log(authData.token); // JWT token
console.log(authData.user);  // User record

// Token is automatically stored
console.log(pb.authStore.token); // Access stored token
```

### OAuth2 Login

```javascript
// Same as registration - creates user if doesn't exist
const authData = await pb.collection('users').authWithOAuth2({
  provider: 'google',
  code: 'OAUTH2_CODE'
});
```

### Magic Link Login

```javascript
// Request magic link
await pb.collection('users').requestVerification('user@example.com');

// User clicks verification link (returns 204 on success)
await pb.collection('users').confirmVerification('VERIFICATION_TOKEN');

// Verification does not log the user in automatically; call authWithPassword or another auth method.
```

## Auth State Management

### Checking Auth Status

```javascript
// Check if user is authenticated
if (pb.authStore.isValid) {
  const user = pb.authStore.model;
  console.log('User is logged in:', user.email);
} else {
  console.log('User is not logged in');
}

// Get current user
const user = pb.authStore.model;

// Refresh auth state
await pb.collection('users').authRefresh();
```

### Auth Store Persistence

The default auth store persists tokens in `localStorage` when available and falls back to an in-memory store otherwise. Call `pb.authStore.clear()` to invalidate the current session. For custom storage implementations, extend the SDK `BaseAuthStore` as described in the [official JS SDK README](https://github.com/pocketbase/js-sdk#auth-store).

### React Auth Hook

```javascript
import { useEffect, useState } from 'react';
import PocketBase from 'pocketbase';

function useAuth(pb) {
  const [user, setUser] = useState(pb.authStore.model);

  useEffect(() => {
    const unsub = pb.authStore.onChange((token, model) => {
      setUser(model);
    });

    return () => unsub();
  }, []);

  return { user };
}

// Usage
function App() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  const { user } = useAuth(pb);

  return user ? (
    <div>Welcome, {user.email}!</div>
  ) : (
    <div>Please log in</div>
  );
}
```

## Logout

```javascript
// Clear auth state
pb.authStore.clear();

// After logout, authStore.model will be null
console.log(pb.authStore.model); // null
```

## Protected Routes (Frontend)

### React Router Protection

```javascript
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { user } = useAuth(pb);

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}

// Usage
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

### Vanilla JS Protection

```javascript
// Check before API call
function requireAuth() {
  if (!pb.authStore.isValid) {
    window.location.href = '/login';
    return false;
  }
  return true;
}

// Usage
if (requireAuth()) {
  const posts = await pb.collection('posts').getList(1, 50);
}
```

## User Profile Management

### Update User Data

```javascript
// Update user profile
const updated = await pb.collection('users').update(user.id, {
  name: 'Jane Doe',
  bio: 'Updated bio',
  avatar: fileInput.files[0]  // File upload
});

// Only authenticated user can update their own profile
// unless using admin API
```

### Change Password

```javascript
// Change password (requires current password)
const updated = await pb.collection('users').update(user.id, {
  oldPassword: 'currentPassword123',
  password: 'newPassword123',
  passwordConfirm: 'newPassword123'
});
```

### Update Email

```javascript
// Update email (triggers verification if enabled)
const updated = await pb.collection('users').update(user.id, {
  email: 'newemail@example.com'
});
```

## Email Verification

### Enable Email Verification

1. Go to Auth Collections → Options
2. Enable "Email verification"
3. Customize verification page
4. Save

### Manual Verification

```javascript
// Request verification email
await pb.collection('users').requestVerification('user@example.com');

// User clicks link with token
const authData = await pb.collection('users').confirmVerification('TOKEN_FROM_URL');
```

### Auto-Verify on OAuth

```javascript
// OAuth users can be auto-verified
// Configure in Auth Collections → OAuth2 providers
// Check "Auto-verification"
```

## Password Reset

### Request Reset

```javascript
// Send password reset email
await pb.collection('users').requestPasswordReset('user@example.com');
```

### Confirm Reset

```javascript
// User clicks link from email
// Reset with token from URL
const authData = await pb.collection('users').confirmPasswordReset(
  'TOKEN_FROM_URL',
  'newPassword123',
  'newPassword123'
);
```

## OAuth2 Configuration

### Google OAuth2 Setup

1. **Google Cloud Console**
   - Create new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `http://localhost:8090/api/oauth2/google/callback`
     - `https://yourdomain.com/api/oauth2/google/callback`

2. **PocketBase Admin UI**
   - Go to Auth Collections → OAuth2 providers
   - Click "Google"
   - Enter Client ID and Client Secret
   - Save

### GitHub OAuth2 Setup

1. **GitHub Developer Settings**
   - New OAuth App
   - Authorization callback URL:
     - `http://localhost:8090/api/oauth2/github/callback`
   - Get Client ID and Secret

2. **PocketBase Admin UI**
   - Configure GitHub provider
   - Enter credentials

### Custom OAuth2 Provider

```javascript
// Most providers follow similar pattern:
// 1. Redirect to provider auth page
// 2. Provider redirects back with code
// 3. Exchange code for access token
// 4. Use access token with PocketBase

// Example: Discord
window.location.href =
  `https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&redirect_uri=${encodeURIComponent('http://localhost:8090/_/')}&response_type=code&scope=identify%20email`;
```

## JWT Token Details

### Token Structure

JWT tokens consist of three parts:
- **Header** - Algorithm and token type
- **Payload** - User data and claims
- **Signature** - HMAC validation

```javascript
// Payload includes (fields may vary depending on the auth collection):
{
  "id": "USER_ID",
  "collectionId": "COLLECTION_ID",
  "collectionName": "users",
  "exp": 1234567890, // expires at
  "iat": 1234567890  // issued at
}
```

### Token Expiration

- Default expiration: 7 days
- Can be customized in Auth Collections → Options
- Tokens remain valid until `exp`; call `pb.collection('users').authRefresh()` to refresh.

### Manual Token Validation

```javascript
// Check if token is still valid
if (pb.authStore.isValid) {
  // Token is valid
  const user = pb.authStore.model;
} else {
  // Token expired or invalid
  // Redirect to login
}
```

## Security Best Practices

### Password Security

```javascript
// Configure in Auth Collections → Options
{
  "minPasswordLength": 8,
  "requirePasswordUppercase": true,
  "requirePasswordLowercase": true,
  "requirePasswordNumbers": true,
  "requirePasswordSymbols": true
}
```

### Account Security

1. **Enable Email Verification**
   - Prevent fake accounts
   - Verify user email ownership

2. **Implement Rate Limiting**
   - Prevent brute force attacks
   - Configure at reverse proxy level

3. **Use HTTPS in Production**
   - Encrypt data in transit
   - Required for OAuth2

4. **Set Appropriate Token Expiration**
   - Balance security and UX
   - Consider refresh tokens

5. **Validate OAuth State**
   - Prevent CSRF attacks
   - Implement proper state parameter

### Common Auth Rules

**Users can only access their own data:**
```
user_id = @request.auth.id
```

**Verified users only:**
```
@request.auth.verified = true
```

**Admins only:**
```
@request.auth.role = 'admin'
```

**Role-based access:**
```
@request.auth.role = 'moderator' || @request.auth.role = 'admin'
```

## Multi-Tenant Authentication

### Workspace/Team Model

```javascript
// collections:
// - users (auth) - email, password
// - workspaces (base) - name, owner_id
// - workspace_members (base) - workspace_id, user_id, role

// Users can access workspaces they're members of:
List Rule: "id != '' && (@request.auth.id != '')"
View Rule: "members.user_id ?~ @request.auth.id"

// On login, filter workspace by user membership
async function getUserWorkspaces() {
  const memberships = await pb.collection('workspace_members').getList(1, 100, {
    filter: `user_id = "${pb.authStore.model.id}"`
  });

  const workspaceIds = memberships.items.map(m => m.workspace_id);
  return workspaceIds;
}
```

## Auth API Reference

### User Methods

```javascript
// Auth collection methods
pb.collection('users').create()           // Register
pb.collection('users').authWithPassword() // Login
pb.collection('users).authWithOAuth2()    // OAuth2
pb.collection('users).authRefresh()       // Refresh
pb.collection('users).requestVerification() // Send verification
pb.collection('users).confirmVerification() // Verify
pb.collection('users).requestPasswordReset() // Reset request
pb.collection('users).confirmPasswordReset() // Confirm reset

// Admin methods
pb.collection('users').getOne(id)        // Get user
pb.collection('users).update(id, data)   // Update user
pb.collection('users).delete(id)         // Delete user
pb.collection('users').listAuthMethods()  // List allowed auth methods and OAuth providers
```

## Troubleshooting

**Login not working**
- Check email/password correctness
- Verify user exists
- Check if account is verified (if verification required)
- Check auth rules don't block access

**OAuth2 redirect errors**
- Verify redirect URI matches exactly
- Check provider configuration
- Ensure HTTPS in production
- Check CORS settings

**Token expired**
- Use authRefresh() to get new token
- Check token expiration time
- Implement auto-refresh logic

**Password reset not working**
- Check if email exists
- Verify reset link wasn't used
- Check spam folder
- Verify email sending configuration

**Can't access protected data**
- Check auth rules
- Verify user is authenticated
- Check user permissions
- Verify collection rules

## Related Topics

- [Collections](collections.md) - Auth collection details
- [API Rules & Filters](api_rules_filters.md) - Security rules
- [Files Handling](files_handling.md) - File uploads
- [Security Rules](../security_rules.md) - Comprehensive access control
- [Going to Production](going_to_production.md) - Production security
