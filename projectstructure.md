# Network Tools Web Application

## Project Structure
```
net-tools-gui/
├── backend/
│   ├── cmd/
│   │   ├── server/
│   │   │   └── main.go
│   └── go.mod
│   └── go.sum
│   ├── internal/
│   │   ├── errors/
│   │   │   └── errors.go
│   │   ├── executor/
│   │   │   └── command.go
│   │   ├── handlers/
│   │   │   └── http.go
│   │   │   └── websocket.go
│   │   ├── logger/
│   │   │   └── logger.go
│   │   ├── metrics/
│   │   │   └── metrics.go
│   │   ├── middleware/
│   │   │   └── middleware.go
│   │   ├── server/
│   │   │   └── server.go
│   │   ├── validator/
│   │   │   └── validator.go
│   ├── pkg/
│   │   ├── tools/
│   │   │   └── dig.go
│   │   │   └── ping.go
│   │   │   └── traceroute.go
├── frontend/
│   └── index.html
│   ├── node_modules/
│   └── package.json
│   └── package-lock.json
│   └── postcss.config.js
│   ├── src/
│   │   └── App.jsx
│   │   ├── components/
│   │   │   └── CommandPanel.jsx
│   │   │   └── OutputDisplay.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── hooks/
│   │   │   └── useRateLimit.js
│   │   │   └── useWebSocket.js
│   │   └── index.css
│   │   └── main.jsx
│   │   ├── pages/
│   │   │   └── Dig.jsx
│   │   │   └── Ping.jsx
│   │   │   └── Traceroute.jsx
│   │   ├── utils/
│   │   │   └── validation.js
│   │   │   └── websocket.js
│   └── tailwind.config.js
│   └── vite.config.js
└── go.mod
└── masterplan.md
└── README.md
└── setup.md
```