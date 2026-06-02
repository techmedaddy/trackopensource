# Open Source Radar

Open Source Radar is a tool to discover GitHub repositories that are growing faster than expected, before they hit the mainstream. 

While total star counts are easy to find, understanding growth rate, velocity, and real developer sentiment is much harder. This project periodically tracks repository metrics and combines them with social signals (like Hacker News mentions) to calculate a momentum score that bubbles up fast-moving projects early.


![Open Source Radar Logo](/home/techmedaddy/.gemini/antigravity/brain/08a8a456-bceb-4c5b-9ad6-dded2f0d910a/osr_professional_logo_1780421604046.png)




## Tech Stack

The platform is designed to run efficiently on lightweight resources (like AWS Free Tier) using a compiled, fast, and modern stack:

*   **Backend:** Rust (Axum, Axios-like client, SQLx with PostgreSQL)
*   **Frontend:** Next.js (React, Tailwind CSS, Shadcn UI)
*   **Database:** PostgreSQL 15
*   **Data Collector:** A dedicated Rust CLI tool built into the backend codebase that runs scheduled ingestion.

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
    ```

3.  Build and start the development containers:
    ```bash
    docker compose up --build -d
    ```

4.  Seed the database by executing the collector command inside the running backend container:
    ```bash
    docker compose exec backend cargo run --bin collector
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

3.  Scroll down to the `backend` container's environment block. Uncomment the `GITHUB_TOKEN` line and paste your token, ensuring the indentation aligns perfectly:
    ```yaml
        environment:
          - DATABASE_URL=postgres://postgres:password@db:5432/open_source_radar
          # Add your GitHub token here for the collector:
          - GITHUB_TOKEN=ghp_your_github_token_here
    ```
    *Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).*

### 5. Build and Deploy
Start the production stack. This uses multi-stage production Dockerfiles that compile the Rust binary and standalone Next.js builds, stripping out compilers to save server resources:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 6. Run the Ingestion Collector
Seed the database on the server with initial trends:
```bash
docker compose -f docker-compose.prod.yml exec backend collector
```

### 7. Configure a Free Subdomain (DuckDNS)
If you do not own a custom domain, you can set up a free subdomain via DuckDNS:
1.  Log in to [duckdns.org](https://www.duckdns.org/) using your GitHub account.
2.  Add a subdomain (e.g., `trackopensource`).
3.  Set the IP address to your EC2 public IP (`13.201.16.75`) and click **update ip**.
4.  Your site will be instantly live at `http://your-subdomain.duckdns.org`!

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT
