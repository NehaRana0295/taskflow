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
type Task = {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};
type PaginatedTasks = {
  data: Task[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};
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

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskError, setTaskError] = useState("");

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);

  // true means the signup form is selected.
  const isRegistering = mode === 'register';
  const [newTitle, setNewTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Check the existing login session when the app opens.
  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const response = await api.get<AuthResponse>('/api/user');

        if (active) {
          setUser(response.data.user);
        }
      } catch (error: unknown) {
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

    void checkSession();

    return () => {
      active = false;
    };
  }, []);

  // Load the selected page after login or whenever the page changes.
  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    async function loadTasks() {
      setLoadingTasks(true);
      setTaskError('');

      try {
        const response = await api.get<PaginatedTasks>('/api/tasks', {
          params: { page },
        });

        if (active) {
          setTasks(response.data.data);
          setLastPage(response.data.last_page);
          setTotalTasks(response.data.total);
        }
      } catch (error: unknown) {
        if (active) {
          setTaskError(errorMessage(error));
        }
      } finally {
        if (active) {
          setLoadingTasks(false);
        }
      }
    }

    void loadTasks();

    return () => {
      active = false;
    };
  }, [user, page]);

  async function saveTask(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const title = newTitle.trim();

  if (!title || title.length > 255) {
    setTaskError('Enter a title between 1 and 255 characters.');
    return;
  }

  setTaskError('');

  if (taskToEdit) {
    setEditingTaskId(taskToEdit.id);
  } else {
    setAddingTask(true);
  }

  try {
    if (taskToEdit) {
      const response = await api.patch<Task>(
        `/api/tasks/${taskToEdit.id}`,
        { title }
      );

      setTasks(previous =>
        previous.map(task =>
          task.id === response.data.id ? response.data : task
        )
      );
    } else {
      const response = await api.post<Task>('/api/tasks', {
        title,
      });

      setTasks(previous => [response.data, ...previous]);
    }

    setNewTitle('');
    setTaskToEdit(null);
  } catch (error: unknown) {
    setTaskError(errorMessage(error));
  } finally {
    setAddingTask(false);
    setEditingTaskId(null);
  }
}

   function editTask(task: Task) {
    setTaskToEdit(task);
    setNewTitle(task.title);
    setTaskError('');

    document.getElementById('task-title')?.focus();
  }

  function cancelEdit() {
    setTaskToEdit(null);
    setNewTitle('');
    setTaskError('');
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) {
      return;
    }

    setDeletingTaskId(task.id);
    setTaskError('');

    try {
      await api.delete(`/api/tasks/${task.id}`);

      setTasks(previous =>
        previous.filter(item => item.id !== task.id)
      );
      if (taskToEdit?.id === task.id) {
      cancelEdit();
      }
    } catch (error: unknown) {
      setTaskError(errorMessage(error));
    } finally {
      setDeletingTaskId(null);
    }
  }

  async function toggleTask(task: Task) {
    setUpdatingTaskId(task.id);
    setTaskError('');

    try {
      const response = await api.patch<Task>(
        `/api/tasks/${task.id}`,
        { completed: !task.completed }
      );

      setTasks(previous =>
        previous.map(item =>
          item.id === task.id ? response.data : item
        )
      );
    } catch (error: unknown) {
      setTaskError(errorMessage(error));
    } finally {
      setUpdatingTaskId(null);
    }
  }

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
      setTasks([]);
      setTaskError('');
      setLoadingTasks(false);
      setMode('login');
      cancelEdit();
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
  const completedCount = tasks.filter(task => task.completed).length;
  const taskBusy = addingTask || updatingTaskId !== null ||
    deletingTaskId !== null || editingTaskId !== null;

  if (checkingSession) {
    return <main className="session-screen"><span className="brand-mark">✓</span><p role="status">Opening your workspace…</p></main>;
  }

  if (user) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href="/"><span className="brand-mark">✓</span>TaskFlow<span className="brand-divider">/</span><span className="workspace-label">Personal workspace</span></a>
          <div className="account">
            <span className="avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
            <span className="account-name">{user.name}</span>
            <button className="button-quiet" disabled={busy || taskBusy} onClick={logout}>{busy ? 'Logging out…' : 'Log out'}</button>
          </div>
        </header>

        <main className="dashboard">
          <div className="page-heading">
            <div><p className="eyebrow">YOUR SPACE TO GET THINGS DONE</p><h1>A little focus.<br />A lot of progress.</h1><p className="muted">Welcome back, {user.name.split(' ')[0]}. Make room for what matters.</p></div>
            <div className="workspace-note"><span aria-hidden="true">✦</span><p>One task at a time.<br /><strong>You’ve got this.</strong></p></div>
          </div>

          <section className="stats" aria-label="Task overview">
            <div className="stat"><span>Total tasks</span><strong>{loadingTasks ? '—' : tasks.length}</strong><small>Everything on your list</small></div>
            <div className="stat"><span>In progress</span><strong>{loadingTasks ? '—' : tasks.length - completedCount}<i className="dot amber" /></strong><small>A little closer to done</small></div>
            <div className="stat"><span>Completed</span><strong>{loadingTasks ? '—' : completedCount}<i className="dot green" /></strong><small>Small wins, real progress</small></div>
          </section>

          <section className="task-panel" aria-labelledby="tasks-heading">
            <div className="panel-heading"><div><h2 id="tasks-heading">My tasks <span className="count">{tasks.length}</span></h2><p className="muted">Capture an idea. Take the next step.</p></div><span className="private-label">Personal list</span></div>
            <form className="add-form" onSubmit={saveTask}>
              <label className="sr-only" htmlFor="task-title">Task title</label>
              <span className="input-plus" aria-hidden="true">+</span>
              <input id="task-title" value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="What would you like to get done?" maxLength={255} disabled={taskBusy || busy} required />
              <button
                  className="button-primary"
                  type="submit"
                  disabled={taskBusy || busy || loadingTasks}
                >
                  {addingTask || editingTaskId !== null
                    ? 'Saving…'
                    : taskToEdit
                      ? 'Save changes'
                      : 'Add task'}
                </button>

                {taskToEdit && (
                  <button
                    className="button-quiet"
                    type="button"
                    disabled={taskBusy || busy}
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                )}
            </form>
            {loadingTasks && <p className="empty-state" role="status">Loading your tasks…</p>}
            {taskError && <p className="alert" role="alert">{taskError}</p>}
            {!loadingTasks && !taskError && tasks.length === 0 && <div className="empty-state"><span className="empty-icon" aria-hidden="true">✓</span><h3>A fresh start</h3><p>Add your first task above. Big things start small.</p></div>}
            <ul className="task-list">
              {tasks.map(task => (
                <li className={task.completed ? 'task-row is-complete' : 'task-row'} key={task.id}>
                  <label className="task-label"><input type="checkbox" checked={task.completed} disabled={taskBusy || busy} onChange={() => void toggleTask(task)} /><span>{task.title}</span></label>
                  <span className={task.completed ? 'badge badge-complete' : 'badge badge-pending'}>{updatingTaskId === task.id ? 'Saving…' : task.completed ? 'Completed' : 'Pending'}</span>
                  <div className="task-actions">
                    <button
                      className="button-quiet"
                      type="button"
                      disabled={taskBusy || busy}
                      onClick={() => editTask(task)}
                    >
                      Edit
                    </button>

                    {taskToEdit && (
                      <button
                        className="button-quiet"
                        type="button"
                        disabled={taskBusy || busy}
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    )}
                    <button className="button-danger" type="button" disabled={taskBusy || busy} onClick={() => void deleteTask(task)} aria-label={`Delete ${task.title}`}>{deletingTaskId === task.id ? 'Deleting…' : 'Delete'}</button>
                  </div>
                </li>
              ))}
            </ul>
            
            <div className="panel-footer">
              <button
                type="button"
                className="button-quiet"
                disabled={page <= 1 || loadingTasks || taskBusy || busy}
                onClick={() => setPage(previous => previous - 1)}
              >
                Previous
              </button>

              <span>
                Page {page} of {lastPage} · {totalTasks} tasks
              </span>

              <button
                type="button"
                className="button-quiet"
                disabled={
                  page >= lastPage || loadingTasks || taskBusy || busy
                }
                onClick={() => setPage(previous => previous + 1)}
              >
                Next
              </button>
            </div>

            {tasks.length > 0 && <div className="panel-footer"><span>{completedCount} of {tasks.length} tasks completed</span><progress value={completedCount} max={tasks.length} aria-label="Task completion" /></div>}
          </section>
          {error && <p className="alert" role="alert">{error}</p>}
          <footer className="page-footer"><span>TaskFlow · Less clutter. More clarity.</span><span>Your next step starts here.</span></footer>
        </main>
      </div>
    );
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <a className="brand" href="/"><span className="brand-mark">✓</span>TaskFlow</a>
        <div><p className="eyebrow">A CLEARER KIND OF PRODUCTIVE</p><h1>Big ideas.<br />Small steps.<br /><em>Real progress.</em></h1><p>A calm space for your tasks, so you can focus on what comes next.</p></div>
        <span className="story-footer">Make today a little more intentional.</span>
      </section>
      <section className="auth-card">
        <p className="eyebrow">YOUR PERSONAL WORKSPACE</p><h2>{heading}</h2>
        <p className="muted">{isRegistering ? 'A fresh start for everything you want to do.' : 'Welcome back. Pick up where you left off.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {isRegistering && <label>Name<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" placeholder="Your name" required /></label>}
          <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></label>
          <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={isRegistering ? 'new-password' : 'current-password'} minLength={isRegistering ? 12 : undefined} required /></label>
          {isRegistering && <><small className="muted">Use at least 12 characters.</small><label>Confirm password<input type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password" minLength={12} required /></label></>}
          {error && <p className="alert" role="alert">{error}</p>}
          <button className="button-primary" type="submit" disabled={busy}>{submitLabel} <span aria-hidden="true">↗</span></button>
        </form>
        <button className="auth-switch button-quiet" type="button" disabled={busy} onClick={switchForm}>{switchLabel}</button>
      </section>
    </main>
  );
}
