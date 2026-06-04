# Open Source Radar

Open Source Radar is a sophisticated analytics platform that discovers GitHub repositories growing faster than expected, before they hit the mainstream. 

While total star counts are easy to find, understanding growth rate, velocity, and real developer sentiment is much harder. This project periodically tracks repository metrics and combines them with social signals (like Hacker News job mentions and Reddit discussions) to calculate a blended momentum score that bubbles up fast-moving projects early.

<img width="512" height="512" alt="track" src="https://github.com/user-attachments/assets/87d9e3ca-da00-4de9-a094-338a66123b65" />

## Features

* **Time-Series Tracking:** Records daily snapshots of stars, forks, issues, and contributors to build an accurate historical growth chart.
* **Blended Ranking Engine:** A dedicated ranking engine calculates Star Velocity, Growth Ratio, Contributor Movement, Activity, Maintenance Pressure, and Social/Hiring Momentum to produce a final `trend_score`.
* **Hiring Intelligence:** Scrapes Hacker News "Who is hiring?" threads to quantify real-world corporate demand for specific open-source technologies.
* **Global Search & Manual Tracking:** Uses the GitHub API to allow users to search for *any* public repository and instantly add it to the tracking radar.
* **Robust Multi-Binary Architecture:** The backend is split into three independent binaries (`backend` API, `collector`, and `ranker`) for modular scaling and cron-job execution.

---

## Tech Stack

The platform is designed to run efficiently on lightweight resources (like AWS Free Tier) using a compiled, fast, and modern stack:

*   **Backend:** Rust (Axum, SQLx with PostgreSQL, Reqwest)
*   **Frontend:** Next.js (React, Tailwind CSS, Shadcn UI)
*   **Database:** PostgreSQL 15
*   **Data Pipelines:** Rust CLI tools (`collector` and `ranker`) built into the backend codebase that execute scheduled ingestion and ranking.

---

## Local Development

The easiest way to run the entire stack locally is using Docker Compose. It comes with hot-reloading configured out of the box for both the frontend and backend.

### Prerequisites
*   Docker and Docker Compose installed.
*   A GitHub Personal Access Token (PAT). Generate a free token under your GitHub settings (Developer settings -> Personal access tokens -> Classic) with the `public_repo` scope.

### Setup Steps

1.  Clone the repository and go to the project root:
    ```bash
    git clone https://github.com/techmedaddy/trackopensource.git
    cd trackopensource
    ```

2.  Create a `.env` file inside the `backend/` directory:
    ```env
    GITHUB_TOKEN=your_personal_access_token_here
    DATABASE_URL=postgres://postgres:password@localhost:5432/open_source_radar
    ```

3.  Build and start the development containers:
    ```bash
    docker compose up --build -d
    ```

4.  Seed the database by executing the collector and ranker commands inside the running backend container:
    ```bash
    # Run the ingestion pipeline (fetches GitHub stats and Social Signals)
    docker compose exec backend cargo run --bin collector

    # Run the ranking engine to calculate scores
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
*   Connect to your instance over SSH:
    ```bash
    ssh -i /path/to/key.pem ubuntu@your-ec2-public-ip
    ```

### 2. Configure System Swap (Crucial for micro instances)
Rust compilation requires more memory than the 1GB provided on AWS free-tier micro instances. To prevent out-of-memory (OOM) crashes during builds, set up a 2GB swap file:
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

2.  Open `docker-compose.prod.yml`:
    ```bash
    nano docker-compose.prod.yml
    ```

3.  Scroll down to the `backend` container's environment block. Uncomment the `GITHUB_TOKEN` line and paste your token:
    ```yaml
        environment:
          - DATABASE_URL=postgres://postgres:password@db:5432/open_source_radar
          # Add your GitHub token here for the collector:
          - GITHUB_TOKEN=ghp_your_github_token_here
    ```

### 5. Build and Deploy
Start the production stack. This uses multi-stage production Dockerfiles that compile the Rust binaries and standalone Next.js builds, stripping out the massive Rust toolchain/compilers in the final image to keep it lightweight and secure.
```bash
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

### 7. Configure a Free Subdomain (DuckDNS)
If you do not own a custom domain, you can set up a free subdomain via DuckDNS:
1.  Log in to [duckdns.org](https://www.duckdns.org/) using your GitHub account.
2.  Add a subdomain (e.g., `trackopensource`).
3.  Set the IP address to your EC2 public IP and click **update ip**.
4.  Your site will be instantly live at `http://your-subdomain.duckdns.org`!

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT
