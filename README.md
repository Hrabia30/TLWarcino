# System zgloszen awarii IT

Prosty system full-stack do zglaszania awarii do dzialu IT.

## Funkcje

- rejestracja i logowanie uzytkownikow
- role `user` i `it`
- tworzenie zgloszen awarii
- przeglad i aktualizacja statusow przez dzial IT
- baza danych PostgreSQL
- uruchamianie przez Docker Compose

## Uruchomienie

```bash
docker compose up --build
```

Po uruchomieniu:

- frontend: `http://localhost:5173`
- backend API: `http://localhost:4000`

Domyslne konto IT:

- login: `it@firma.local`
- haslo: `Admin123!`
