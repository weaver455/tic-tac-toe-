// Reston Weaver
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;
const GAME_PASSWORD = process.env.GAME_PASSWORD || "secret123";

app.use(express.static(path.join(__dirname, "public")));

let gameState = {
  board: Array(9).fill(""),
  currentPlayer: "X",
  winner: null,
};

const players = {
  X: null,
  O: null,
};

function sendMessage(client, message) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

function sendError(client, message) {
  sendMessage(client, { type: "error", message });
}

function broadcastState() {
  const payload = JSON.stringify({ type: "state", gameState });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [first, second, third] of lines) {
    if (
      board[first] &&
      board[first] === board[second] &&
      board[first] === board[third]
    ) {
      return board[first];
    }
  }

  return null;
}

wss.on("connection", (client) => {
  client.playerName = "";
  client.role = "spectator";
  client.authenticated = false;
  sendMessage(client, { type: "state", gameState });

  client.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch {
      sendError(client, "Message must be valid JSON.");
      return;
    }

    if (!data || typeof data.type !== "string") {
      sendError(client, "Message type is required.");
      return;
    }

    if (data.type === "login") {
      if (client.authenticated) {
        sendMessage(client, {
          type: "role",
          role: client.role,
          name: client.playerName,
        });
        return;
      }

      const name = typeof data.name === "string" ? data.name.trim() : "";
      if (!name || name.length > 40) {
        sendError(client, "Enter a name between 1 and 40 characters.");
        return;
      }
      if (data.password !== GAME_PASSWORD) {
        sendError(client, "Invalid password.");
        return;
      }

      client.playerName = name;
      client.authenticated = true;

      if (!players.X) {
        players.X = client;
        client.role = "X";
      } else if (!players.O) {
        players.O = client;
        client.role = "O";
      } else {
        client.role = "spectator";
      }

      sendMessage(client, {
        type: "role",
        role: client.role,
        name: client.playerName,
      });
      return;
    }

    if (!client.authenticated) {
      sendError(client, "Join the game before sending game commands.");
      return;
    }

    if (data.type === "place") {
      if (client.role !== "X" && client.role !== "O") {
        sendError(client, "Spectators cannot place pieces.");
        return;
      }
      if (client.role !== gameState.currentPlayer) {
        sendError(client, "It is not your turn.");
        return;
      }
      if (
        !Number.isInteger(data.index) ||
        data.index < 0 ||
        data.index >= gameState.board.length ||
        gameState.board[data.index] !== "" ||
        gameState.winner ||
        gameState.board.every(Boolean)
      ) {
        sendError(client, "That move is not available.");
        return;
      }

      gameState.board[data.index] = gameState.currentPlayer;
      gameState.winner = checkWinner(gameState.board);
      if (!gameState.winner) {
        gameState.currentPlayer =
          gameState.currentPlayer === "X" ? "O" : "X";
      }

      broadcastState();
      return;
    }

    if (data.type === "reset") {
      if (client.role !== "X" && client.role !== "O") {
        sendError(client, "Only players can reset the game.");
        return;
      }

      gameState = {
        board: Array(9).fill(""),
        currentPlayer: "X",
        winner: null,
      };
      broadcastState();
      return;
    }

    sendError(client, "Unknown message type.");
  });

  client.on("close", () => {
    if (players.X === client) {
      players.X = null;
    }
    if (players.O === client) {
      players.O = null;
    }
  });

  client.on("error", (error) => {
    console.error("WebSocket client error:", error.message);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
