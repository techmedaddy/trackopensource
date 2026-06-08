# Open Source Career Radar

Open Source Career Radar is a specialized analytics dashboard that discovers GitHub repositories growing faster than expected, and juxtaposes their developer mindshare against real-world enterprise hiring demand.

While total star counts are easy to find, understanding whether a hyped framework will actually get you a job is much harder. This project tracks repository growth metrics and combines them with social signals (Hacker News job mentions, Reddit discussions) to surface a **Hype vs. Hiring Matrix**, helping engineers choose technologies that offer both momentum and career stability.

<img width="1024" height="1024" alt="track" src="https://github.com/user-attachments/assets/87d9e3ca-da00-4de9-a094-338a66123b65" />

## Features

* **Hype vs. Hiring Matrix:** A 2x2 scatter plot visualizing the gap between developer mindshare (velocity, stars, social buzz) and corporate adoption (job mentions). Spots "Golden Zone" frameworks vs. "Speculative" tech.
* **Category & Stack Filtering:** Filter tables and charts instantly by domains like AI, Backend, Rust, or DevOps.
* **Proactive Alerts (Retention Engine):** Automatically dispatches Discord webhook alerts when repositories experience a "Momentum Breakout" or enter the "Golden Zone" (High Hype + High Hiring).
* **Blended Ranking Engine:** Calculates Star Velocity, Growth Ratio, Contributor Movement, Activity, Maintenance Pressure, and Social/Hiring Momentum to produce a final `trend_score`.
* **Robust Multi-Binary Architecture:** The backend is split into three independent binaries (`backend` API, `collector`, and `ranker`) for modular scaling and cron-job execution.

---

## Tech Stack

The platform is designed to run efficiently on lightweight resources (like AWS Free Tier) using a compiled, fast, and modern stack:

*   **Backend:** Rust (Axum, SQLx with PostgreSQL, Reqwest)
*   **Frontend:** Next.js (React, Tailwind CSS, Recharts)
*   **Database:** PostgreSQL 15
*   **Data Pipelines:** Rust CLI tools (`collector` and `ranker`) built into the backend codebase that execute scheduled ingestion and ranking.

---

## Local Development

The easiest way to run the entire stack locally is using Docker Compose.

### Prerequisites
*   Docker and Docker Compose installed.
*   A GitHub Personal Access Token (PAT). Generate a free token under your GitHub settings (Developer settings -> Personal access tokens -> Classic) with the `public_repo` scope.
*   (Optional) A Discord Webhook URL for receiving breakout alerts.

### Setup Steps

1.  Clone the repository and go to the project root:
    ```bash
    git clone https://github.com/techmedaddy/trackopensource.git
    cd trackopensource
    ```

2.  Create a `.env` file inside the `backend/` directory:
    ```env
    GITHUB_TOKEN=your_personal_access_token_here
    DATABASE_URL=postgres://postgres:password@db:5432/open_source_radar
    DISCORD_WEBHOOK_URL=your_discord_webhook_url_here
    ```

3.  Build and start the development containers:
    ```bash
    docker compose up --build -d
    ```

4.  Seed the database by executing the collector and ranker commands inside the running backend container:
    ```bash
    # Run the ingestion pipeline (fetches GitHub stats and Social Signals)
    docker compose exec backend cargo run --bin collector

    # Run the ranking engine to calculate scores (triggers alerts if configured)
    docker compose exec backend cargo run --bin ranker
    ```

The frontend will be running at `http://localhost:3000` and the API backend at `http://localhost:8080`.

---

## Production Deployment (AWS EC2 Guide)

This project is highly optimized to compile and run on a cost-free AWS EC2 instance (such as a `t3.micro` or `t2.micro` running Ubuntu). Below are the exact steps to deploy it.

### 1. Launch and Configure your EC2 Instance
*   Choose **Ubuntu Server 24.04/26.04 LTS** as your OS.
*   Select instance type `t3.micro` (or `t2.micro`).
*   In your **Security Group**, open the following ports to the public:
    *   `22` (SSH)
    *   `80` (HTTP)
    *   `443` (HTTPS)
*   Connect to your instance over SSH:
    ```bash
    ssh -i /path/to/key.pem ubuntu@your-ec2-public-ip
    ```

### 2. Configure System Swap (Crucial for micro instances)
Rust and Next.js compilation requires more memory than the 1GB provided on AWS free-tier micro instances. To prevent out-of-memory (OOM) crashes during builds, set up a 2GB swap file:
```bash
sudo dd if=/dev/zero of=/swapfile bs=128M count=16
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3. Install Docker and Compose
Run these commands on the server to install Docker:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
newgrp docker
```

### 4. Clone and Configure Production Environment
1.  Clone the repository to your EC2 home folder:
    ```bash
    git clone https://github.com/techmedaddy/trackopensource.git
    cd trackopensource
    ```

2.  Create a `.env` file for your backend secrets:
    ```bash
    cd backend
    nano .env
    ```
    Add your variables:
    ```env
    DATABASE_URL=postgres://postgres:password@db:5432/open_source_radar
    GITHUB_TOKEN=ghp_your_github_token_here
    DISCORD_WEBHOOK_URL=your_discord_webhook_url_here
    ```

### 5. Build and Deploy
Start the production stack. This uses multi-stage production Dockerfiles that compile the Rust binaries and standalone Next.js builds, stripping out the massive Rust toolchain/compilers in the final image to keep it lightweight and secure.
```bash
# From the root of the project
docker compose -f docker-compose.prod.yml up -d --build
```

### 6. Run the Pipelines
Because the production container is a stripped-down environment, `cargo` does not exist. You execute the compiled binaries directly to seed your live database:
```bash
# 1. Run the collector
docker compose -f docker-compose.prod.yml exec backend collector

# 2. Run the ranker
docker compose -f docker-compose.prod.yml exec backend ranker
```

*(Note: In a true production environment, you would set up a cron job on the EC2 instance to run these two commands daily).*

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT
