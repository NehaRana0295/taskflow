/**
 * Shows signup, login, or the dashboard.
 * Sends your details to Laravel and shows its reply.
 */
// Bring in the tools this screen needs.
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { api, prepareCsrf } from './api';
// The details we expect for one user.
type User = {
  id: number;
  name: string;
  email: string;
};
// The login/signup reply contains a user.
type AuthResponse = {
  user: User;
};
// Possible error details from Laravel.
type ApiError = {
  message?: string;
  errors?: { [field: string]: string[] };
};
// Pick one error message to show on screen.
function errorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiError>(error)) {
    return 'Something went wrong.';
  }
  if (!error.response) {
    return 'Could not reach the server.';
  }

  const data = error.response.data;
  if (data && data.errors) {
    for (const field in data.errors) {
      const messages = data.errors[field];

      if (messages.length > 0) {
        return messages[0];
      }
    }
  }

  if (data && data.message) {
    return data.message;
  }

  return 'Could not reach the server.';
}

// This function decides what appears on screen.
export default function App() {
  // Remember which form to show: signup or login.
  const [mode, setMode] = useState<'login' | 'register'>('register');
  // user holds the person's details. setUser updates them. null means empty.
  const [user, setUser] = useState<User | null>(null);
  // Are we still checking whether you are logged in?
  const [checkingSession, setCheckingSession] = useState(true);
  // Are we waiting for a request to finish?
  const [busy, setBusy] = useState(false);
  // The error message to display, if any.
  const [error, setError] = useState('');
  // Remember what you type into each box.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  // true means the signup form is selected.
  const isRegistering = mode === 'register';
  // When this screen opens, ask Laravel whether you are already logged in.
  useEffect(() => {
    // Stop using the reply if this check is no longer needed.
    let active = true;

    async function checkSession() {
      try {
        const response = await api.get<AuthResponse>('/api/user');

        if (active) {
          setUser(response.data.user);
        }
      } catch (error: unknown) {
        // 401 means you are not logged in. That is normal here.
        const isGuest =
          axios.isAxiosError(error) && error.response?.status === 401;

        if (active && !isGuest) {
          setError(errorMessage(error));
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }
    // Start the login check.
    void checkSession();
    // Ignore any late reply after React finishes with this check.
    return () => {
      active = false;
    };
  }, []);
  // Runs when you click Sign up or Log in.
  async function submit(event: FormEvent<HTMLFormElement>) {
    // Keep the page from reloading.
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      // Prepare Laravel's protection against unwanted form requests.
      await prepareCsrf();
      let response;

      // Send signup details, or just email/password for login.
      if (isRegistering) {
        response = await api.post<AuthResponse>('/register', {
          name: name,
          email: email,
          password: password,
          password_confirmation: confirmation,
        });
      } else {
        response = await api.post<AuthResponse>('/login', {
          email: email,
          password: password,
        });
      }
      // Remember the user from Laravel so we can show the dashboard.
      setUser(response.data.user);
      setPassword('');
      setConfirmation('');
    } catch (error: unknown) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  // Ask Laravel to log out, then show the login form.
  async function logout() {
    setError('');
    setBusy(true);

    try {
      await api.post('/logout');
      setUser(null);
      setMode('login');
    } catch (error: unknown) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  // Change between signup and login. Clear passwords and old errors.
  function switchForm() {
    if (isRegistering) {
      setMode('login');
    } else {
      setMode('register');
    }

    setError('');
    setPassword('');
    setConfirmation('');
  }
  // Choose the heading and button text.
  let heading = 'Log in';
  let submitLabel = 'Log in';
  let switchLabel = 'Need an account? Sign up';

  if (isRegistering) {
    heading = 'Create an account';
    submitLabel = 'Sign up';
    switchLabel = 'Already have an account? Log in';
  }

  if (busy) {
    submitLabel = 'Please wait...';
  }
  // Still checking? Show a waiting message.
  if (checkingSession) {
    return <p>Checking your session...</p>;
  }
  // Have user details? Show the dashboard.
  if (user) {
    return (
      <main>
        <h1>TaskFlow</h1>
        <h2>Welcome, {user.name}</h2>
        <p>You are logged in as {user.email}.</p>
        <p>Your tasks will appear here from Day 3.</p>
        {/* Show an error only when there is one. */}
        {error && <p role="alert">{error}</p>}

        <button disabled={busy} onClick={logout}>
          {busy ? 'Please wait...' : 'Log out'}
        </button>
      </main>
    );
  }
  // Otherwise, show the signup or login form.
  return (
    <main>
      <h1>TaskFlow</h1>
      <h2>{heading}</h2>
      {/* Submitting this form runs submit(). */}
      <form onSubmit={submit}>
        {/* Show this box only during signup. */}
        {isRegistering && (
          <p>
            <label>
              Name
              <input
                // Show what you typed and remember any changes.
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
              />
            </label>
          </p>
        )}

        <p>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
        </p>

        <p>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={
                isRegistering ? 'new-password' : 'current-password'
              }
              minLength={isRegistering ? 12 : undefined}
              required
            />
          </label>
        </p>

        {/* Show this box only during signup. */}
        {isRegistering && (
          <p>
            <label>
              Confirm password
              <input
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                minLength={12}
                required
              />
            </label>
          </p>
        )}
        {/* Show an error only when there is one. */}
        {error && <p role="alert">{error}</p>}
        {/* Wait for the reply before allowing another click. */}
        <button type="submit" disabled={busy}>
          {submitLabel}
        </button>
      </form>

      <p>
        <button
          type="button"
          disabled={busy}
          onClick={switchForm}
        >
          {switchLabel}
        </button>
      </p>
    </main>
  );
}
