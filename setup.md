# Network Tools Web Application

## Project Structure
```
network-tools/
├── .github/
│   └── workflows/
│       └── ci.yml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CommandPanel/
│   │   │   │   └── index.jsx
│   │   │   ├── OutputDisplay/
│   │   │   │   └── index.jsx
│   │   │   ├── Sidebar/
│   │   │   │   └── index.jsx
│   │   │   └── ToolConfig/
│   │   │       └── index.jsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js
│   │   │   └── useRateLimit.js
│   │   ├── pages/
│   │   │   ├── Ping.jsx
│   │   │   ├── Dig.jsx
│   │   │   └── Traceroute.jsx
│   │   ├── utils/
│   │   │   ├── validation.js
│   │   │   └── websocket.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── handlers/
│   │   │   ├── websocket.go
│   │   │   └── http.go
│   │   ├── middleware/
│   │   │   ├── ratelimit.go
│   │   │   └── security.go
│   │   ├── executor/
│   │   │   └── command.go
│   │   └── validator/
│   │       └── input.go
│   ├── pkg/
│   │   └── tools/
│   │       ├── ping.go
│   │       ├── dig.go
│   │       └── traceroute.go
│   └── go.mod
├── .gitignore
└── README.md
```

# Network Tools Web Application - WSL Setup Guide

## Prerequisites Check
First, ensure you're running an up-to-date version of Ubuntu WSL:
```bash
# Check WSL version
wsl --version

# Update WSL if needed
wsl --update

# Check Ubuntu version
lsb_release -a
```

## Development Environment Setup

### 1. Node.js Setup via NVM
```bash
# Install curl if not already installed
sudo apt-get update
sudo apt-get install -y curl

# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Add nvm configuration to your shell (if not automatically added)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Reload shell configuration
source ~/.bashrc

# Verify nvm installation
nvm --version

# Install latest LTS version of Node.js
nvm install --lts

# Set LTS as default
nvm alias default 'lts/*'

# Verify installation
node --version  # Should show v22.11.0
npm --version   # Should show 10.9.0
```

### 2. Go Installation (Latest LTS - v1.23.2)
```bash
# Remove any existing Go installation (if needed)
sudo rm -rf /usr/local/go

# Download Go 1.23.2
wget https://go.dev/dl/go1.23.2.linux-amd64.tar.gz

# Extract Go to /usr/local
sudo tar -C /usr/local -xzf go1.23.2.linux-amd64.tar.gz

# Add Go to PATH in your ~/.bashrc
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.bashrc
source ~/.bashrc

# Verify installation
go version  # Should show go1.23.2
```

### 3. Project Setup
```bash
# Create project directory
mkdir -p ~/source/net-tools-gui
cd ~/source/net-tools-gui

# Initialize frontend
mkdir -p frontend
cd frontend
npm create vite@latest . -- --template preact
npm install

# Install additional frontend dependencies
npm install @tailwindcss/forms @tailwindcss/typography
npm install -D tailwindcss postcss autoprefixer
npm install -D @preact/preset-vite
npx tailwindcss init -p

# Initialize backend
cd ..
mkdir -p backend
cd backend
go mod init net-tools-gui
go mod tidy

# Add required Go packages
go get -u github.com/gorilla/websocket
go get -u github.com/gin-gonic/gin
```

### 4. Development Environment Startup
```bash

# Terminal 1 - Start frontend development server
cd ~/source/net-tools-gui/frontend
npm run dev

# Terminal 2 - Start backend server
cd ~/source/net-tools-gui/backend
go run cmd/server/main.go
```

## WSL-Specific Optimizations

### 1. Node.js Performance in WSL
Add these to your `~/.bashrc`:
```bash
# Improve Node.js performance in WSL
export NODE_OPTIONS="--max-old-space-size=8192"
# Improve npm performance
npm config set cache /tmp/npm-cache --global
```

### 2. File Watching Configuration
Create or modify `frontend/vite.config.js`:
```javascript
export default defineConfig({
  server: {
    watch: {
      usePolling: true
    }
  }
})
```

### 3. Network Tools Installation
```bash
# Install required network tools
sudo apt-get update
sudo apt-get install -y iputils-ping dnsutils traceroute
```

## Verification Steps

After setup, verify your environment:

1. Check versions:
```bash
nvm --version     # Should show 0.39.7 or later
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x
go version        # Should show go1.22.1
```

2. Verify development server access:
- Frontend: http://localhost:3000
- Backend: http://localhost:8080


## Common Issues and Solutions

### 1. NVM Command Not Found
If you get "nvm: command not found" after installation:
```bash
# Close and reopen your terminal, or
source ~/.bashrc
```

### 2. Node.js Version Switching
To switch Node.js versions if needed:
```bash
# List installed versions
nvm ls

# Install specific version
nvm install 20.11.1

# Switch to specific version
nvm use 20.11.1
```

### 3. WSL Memory Issues
If you experience memory issues, add to your `%UserProfile%\.wslconfig` on Windows:
```
[wsl2]
memory=8GB
processors=4
```

Would you like me to:
1. Explain any specific part of the setup in more detail?
2. Help you troubleshoot any specific issues?
3. Show you how to verify any particular component?