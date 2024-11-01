# Network Tools Web Application

## Project Structure
```
net-tools-gui/
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
# Test health endpoint
curl http://localhost:8080/health

# Test tools list endpoint
curl http://localhost:8080/api/v1/tools