import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const emptyTicket = {
  title: "",
  description: "",
  category: "sprzet",
  priority: "medium",
  location: "",
  deviceName: ""
};

const emptyRegister = {
  fullName: "",
  email: "",
  password: "",
  department: ""
};

const emptyLogin = {
  email: "",
  password: ""
};

function App() {
  const [mode, setMode] = useState("login");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [itUsers, setItUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [ticketForm, setTicketForm] = useState(emptyTicket);
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...options
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Wystapil blad.");
    }

    return data;
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setTickets([]);
    setStats(null);
    setMessage("");
    setError("");
  }

  async function loadSession() {
    if (!token) {
      return;
    }

    try {
      const me = await api("/api/auth/me");
      setUser(me);
    } catch (_error) {
      logout();
    }
  }

  async function loadTickets() {
    const allTickets = await api("/api/tickets");
    setTickets(allTickets);
  }

  async function loadItUsers() {
    const users = await api("/api/users/it");
    setItUsers(users);
  }

  async function loadStats() {
    if (user?.role !== "it") {
      return;
    }

    const data = await api("/api/dashboard/stats");
    setStats(data);
  }

  useEffect(() => {
    loadSession();
  }, [token]);

  useEffect(() => {
    if (!user) {
      return;
    }

    loadTickets().catch((err) => setError(err.message));
    loadItUsers().catch((err) => setError(err.message));
    if (user.role === "it") {
      loadStats().catch((err) => setError(err.message));
    }
  }, [user]);

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(registerForm)
      });
      localStorage.setItem("token", data.token);
      setToken(data.token);
      setRegisterForm(emptyRegister);
      setMessage("Konto zostalo utworzone.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm)
      });
      localStorage.setItem("token", data.token);
      setToken(data.token);
      setLoginForm(emptyLogin);
      setMessage("Zalogowano pomyslnie.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleTicketSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await api("/api/tickets", {
        method: "POST",
        body: JSON.stringify(ticketForm)
      });
      setTicketForm(emptyTicket);
      setMessage("Zgloszenie zostalo przekazane do dzialu IT.");
      await loadTickets();
      if (user?.role === "it") {
        await loadStats();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleTicketUpdate(ticketId, payload) {
    setError("");
    setMessage("");

    try {
      await api(`/api/tickets/${ticketId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setMessage("Zgloszenie zostalo zaktualizowane.");
      await loadTickets();
      await loadStats();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <div className="page auth-page">
        <section className="hero-card">
          <p className="eyebrow">Portal Helpdesk</p>
          <h1>Zglos awarie do dzialu IT bez maili i chaosu</h1>
          <p className="hero-copy">
            Prosty panel, w ktorym pracownik wysyla problem, a zespol IT widzi kolejke,
            przypisuje zgloszenia i pilnuje realizacji.
          </p>
          <div className="hero-pills">
            <span>konta uzytkownikow</span>
            <span>statusy zgloszen</span>
            <span>baza PostgreSQL</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Logowanie
            </button>
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              Rejestracja
            </button>
          </div>

          {error && <div className="notice error">{error}</div>}
          {message && <div className="notice success">{message}</div>}

          {mode === "login" ? (
            <form className="stack" onSubmit={handleLogin}>
              <input
                placeholder="Adres e-mail"
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
              />
              <input
                placeholder="Haslo"
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm({ ...loginForm, password: event.target.value })
                }
              />
              <button type="submit">Zaloguj sie</button>
              <p className="hint">Konto IT: it@firma.local / Admin123!</p>
            </form>
          ) : (
            <form className="stack" onSubmit={handleRegister}>
              <input
                placeholder="Imie i nazwisko"
                value={registerForm.fullName}
                onChange={(event) =>
                  setRegisterForm({ ...registerForm, fullName: event.target.value })
                }
              />
              <input
                placeholder="Adres e-mail"
                type="email"
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm({ ...registerForm, email: event.target.value })
                }
              />
              <input
                placeholder="Haslo"
                type="password"
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm({ ...registerForm, password: event.target.value })
                }
              />
              <input
                placeholder="Dzial"
                value={registerForm.department}
                onChange={(event) =>
                  setRegisterForm({ ...registerForm, department: event.target.value })
                }
              />
              <button type="submit">Utworz konto</button>
            </form>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Witaj</p>
          <h2>{user.full_name}</h2>
          <p className="subtle">
            {user.role === "it" ? "Dzial IT" : user.department || "Pracownik"} | {user.email}
          </p>
        </div>
        <button className="ghost" onClick={logout}>
          Wyloguj
        </button>
      </header>

      {error && <div className="notice error">{error}</div>}
      {message && <div className="notice success">{message}</div>}

      {user.role === "it" && stats ? (
        <section className="stats-grid">
          <article className="stat-card">
            <span>Wszystkie zgloszenia</span>
            <strong>{stats.tickets}</strong>
          </article>
          <article className="stat-card">
            <span>Otwarte sprawy</span>
            <strong>{stats.openTickets}</strong>
          </article>
          <article className="stat-card">
            <span>Konta w systemie</span>
            <strong>{stats.users}</strong>
          </article>
        </section>
      ) : null}

      <main className="content-grid">
        <section className="card">
          <div className="card-head">
            <h3>Nowe zgloszenie awarii</h3>
            <p>Formularz trafia bezposrednio do dzialu IT.</p>
          </div>

          <form className="stack" onSubmit={handleTicketSubmit}>
            <input
              placeholder="Tytul problemu"
              value={ticketForm.title}
              onChange={(event) => setTicketForm({ ...ticketForm, title: event.target.value })}
            />
            <textarea
              placeholder="Opisz awarie, objawy i co juz zostalo sprawdzone"
              rows="5"
              value={ticketForm.description}
              onChange={(event) =>
                setTicketForm({ ...ticketForm, description: event.target.value })
              }
            />
            <div className="split">
              <select
                value={ticketForm.category}
                onChange={(event) =>
                  setTicketForm({ ...ticketForm, category: event.target.value })
                }
              >
                <option value="sprzet">Sprzet</option>
                <option value="oprogramowanie">Oprogramowanie</option>
                <option value="siec">Siec</option>
                <option value="drukarka">Drukarka</option>
                <option value="inne">Inne</option>
              </select>
              <select
                value={ticketForm.priority}
                onChange={(event) =>
                  setTicketForm({ ...ticketForm, priority: event.target.value })
                }
              >
                <option value="low">Niski</option>
                <option value="medium">Sredni</option>
                <option value="high">Wysoki</option>
                <option value="critical">Krytyczny</option>
              </select>
            </div>
            <div className="split">
              <input
                placeholder="Lokalizacja"
                value={ticketForm.location}
                onChange={(event) =>
                  setTicketForm({ ...ticketForm, location: event.target.value })
                }
              />
              <input
                placeholder="Nazwa komputera / urzadzenia"
                value={ticketForm.deviceName}
                onChange={(event) =>
                  setTicketForm({ ...ticketForm, deviceName: event.target.value })
                }
              />
            </div>
            <button type="submit">Wyslij do IT</button>
          </form>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>{user.role === "it" ? "Kolejka zgloszen" : "Moje zgloszenia"}</h3>
            <p>
              {user.role === "it"
                ? "Tutaj mozesz przypisywac i aktualizowac statusy."
                : "Sprawdzaj status swoich problemow."}
            </p>
          </div>

          <div className="ticket-list">
            {tickets.length === 0 ? (
              <div className="empty-state">Brak zgloszen do wyswietlenia.</div>
            ) : (
              tickets.map((ticket) => (
                <article className="ticket-card" key={ticket.id}>
                  <div className="ticket-top">
                    <div>
                      <h4>{ticket.title}</h4>
                      <p className="subtle">
                        {ticket.category} | priorytet: {ticket.priority} | status: {ticket.status}
                      </p>
                    </div>
                    <span className={`status-pill ${ticket.status}`}>{ticket.status}</span>
                  </div>
                  <p>{ticket.description}</p>
                  <p className="subtle">
                    Lokalizacja: {ticket.location || "brak"} | Sprzet: {ticket.device_name || "brak"}
                  </p>
                  <p className="subtle">
                    Zglaszajacy: {ticket.created_by_name}
                    {ticket.assigned_to_name ? ` | przypisane do: ${ticket.assigned_to_name}` : ""}
                  </p>

                  {user.role === "it" ? (
                    <div className="split actions">
                      <select
                        defaultValue={ticket.status}
                        onChange={(event) =>
                          handleTicketUpdate(ticket.id, { status: event.target.value })
                        }
                      >
                        <option value="new">new</option>
                        <option value="in_progress">in_progress</option>
                        <option value="resolved">resolved</option>
                      </select>
                      <select
                        defaultValue={ticket.assigned_to || ""}
                        onChange={(event) =>
                          handleTicketUpdate(ticket.id, {
                            assignedTo: event.target.value ? Number(event.target.value) : null
                          })
                        }
                      >
                        <option value="">Bez przypisania</option>
                        {itUsers.map((itUser) => (
                          <option key={itUser.id} value={itUser.id}>
                            {itUser.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
