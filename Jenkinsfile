pipeline {
    agent any

    triggers {
        cron('0 0 * * *') // Run every day at 00:00 UTC
    }

    environment {
        // These credentials need to be configured in Jenkins Credentials Manager
        // using the "Secret text" credential type.
        DATABASE_URL = credentials('open-source-radar-db-url')
        GITHUB_TOKEN = credentials('open-source-radar-github-token')
        
        // Ensure Cargo bin is in PATH for Rust execution
        PATH = "$PATH:$HOME/.cargo/bin"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup Rust') {
            steps {
                sh '''
                if ! command -v rustup &> /dev/null; then
                    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
                fi
                rustup update stable
                '''
            }
        }

        stage('Run Data Collector') {
            steps {
                dir('backend') {
                    sh 'cargo run --bin collector'
                }
            }
        }
    }

    post {
        failure {
            echo 'Data collection failed! Please check the logs and database connection.'
        }
        success {
            echo 'Data collection completed successfully!'
        }
    }
}
