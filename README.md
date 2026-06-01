# 📡 Open Source Radar

> Discover repositories growing faster than expected, before they hit the mainstream.

Most GitHub discovery is terrible. By the time a project appears on GitHub Trending, Hacker News, or X/Twitter, you're already late. 

**Open Source Radar** is designed to answer one question: *Which repositories are gaining momentum right now, why are they growing, and are they likely to become important?* 

Think of it as a Bloomberg Terminal for open source, or a momentum tracker for developers, founders, and investors looking for the next big infrastructure tool or ecosystem.

## ✨ Features

- **Time-Machine Snapshots**: We don't just track total stars. We take daily snapshots of repositories to calculate true velocity and momentum.
- **Advanced Ranking Engine**: Projects are scored based on Star Velocity, Growth Ratio, Contributor Growth, and Social Signals (Hacker News & Reddit mentions).
- **Early Trend Detection**: Easily filter for projects under 1,000 stars that are showing abnormal growth patterns.
- **Social Context**: Understand *why* a project is trending by cross-referencing GitHub activity with discussions on Hacker News and Reddit.

## 🏗️ Architecture & Tech Stack

This project is built for performance and reliability, utilizing a robust, fully-typed stack:

**Backend:**
- **Language:** Rust 🦀
- **Framework:** Axum & Tokio (Async)
- **Database:** PostgreSQL (with `sqlx` for compile-time query checking)

**Frontend:**
- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS & shadcn/ui
- **Charts:** Recharts

**Data Collection:**
- Dedicated Rust `collector` binary that interfaces with GitHub API, Algolia (Hacker News), and Reddit APIs.

## 🚀 Getting Started (Local Development)

We use Docker Compose to make running the entire stack as painless as possible. The setup includes hot-reloading for both the Rust backend and the Next.js frontend!

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose installed on your machine.
- A GitHub Personal Access Token (for the data collector). Create a `.env` file in the `backend/` directory with `GITHUB_TOKEN=your_token_here`.

### 1. Spin up the Stack
Simply run this command from the root of the project:
```bash
docker compose up --build -d
```
*Note: The very first time you run this, it will take a few minutes to download the Rust and Node dependencies and compile the backend.*

### 2. Access the Application
Once the containers are up and running, you can access the services here:
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:8080](http://localhost:8080)
- **Postgres Database:** `localhost:5432`

### 3. Seed the Database
Because your local database will initially be empty, you need to run the data collector to fetch the latest metrics and social signals.

Open a new terminal and run:
```bash
docker compose exec backend cargo run --bin collector
```
*(You will need to run this periodically to keep your local data fresh!)*

## 🤝 Contributing

We love contributions! Since this is an open-source project aimed at improving the open-source ecosystem itself, your help is incredibly valuable.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
