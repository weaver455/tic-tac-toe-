// Reston Weaver
const cells = Array.from(document.querySelectorAll(".cell"));
const loginForm = document.querySelector("#login");
const nameInput = document.querySelector("#nameInput");
const passwordInput = document.querySelector("#passwordInput");
const joinButton = document.querySelector("#joinBtn");
const loginHintToggle = document.querySelector("#login-hint-toggle");
const loginHint = document.querySelector("#login-hint");
const roleElement = document.querySelector("#role");
const connectionStatus = document.querySelector("#connection-status");
const gameStatus = document.querySelector("#game-status");
const resetButton = document.querySelector("#resetBtn");
const winScreen = document.querySelector("#win-screen");
const resultTitle = document.querySelector("#result-title");
const playAgainButton = document.querySelector("#play-again-button");

const winningCombinations = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

let gameState = null;
let role = "spectator";
let playerName = "";
let authenticated = false;
let resultKey = null;
let ws;

function getWebSocketUrl() {
  if (window.location.protocol === "file:") {
    return "ws://localhost:3000";
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
}

function isGameOver() {
  return (
    gameState !== null &&
    (gameState.winner !== null || gameState.board.every(Boolean))
  );
}

function updateControls() {
  const connected = ws.readyState === WebSocket.OPEN;
  joinButton.disabled = !connected || authenticated;
  resetButton.disabled =
    !connected || !authenticated || (role !== "X" && role !== "O");

  cells.forEach((cell, index) => {
    const mark = gameState?.board[index] || "";
    cell.disabled =
      !connected ||
      !authenticated ||
      (role !== "X" && role !== "O") ||
      !gameState ||
      isGameOver() ||
      role !== gameState.currentPlayer ||
      Boolean(mark);
  });
}

function renderBoard() {
  if (!gameState) {
    updateControls();
    return;
  }

  const isDraw = !gameState.winner && gameState.board.every(Boolean);
  const statusText = gameState.winner
    ? `Player ${gameState.winner} wins!`
    : isDraw
      ? "It's a draw!"
      : `Player ${gameState.currentPlayer}'s turn`;
  const turnMark = gameStatus.querySelector(".turn-mark");
  turnMark.textContent = gameState.currentPlayer;
  turnMark.classList.toggle("mark-x", gameState.currentPlayer === "X");
  turnMark.classList.toggle("mark-o", gameState.currentPlayer === "O");
  gameStatus.querySelector("span:last-child").textContent = statusText;

  const winningCombination = gameState.winner
    ? winningCombinations.find((combination) =>
        combination.every(
          (index) => gameState.board[index] === gameState.winner,
        ),
      )
    : null;

  cells.forEach((cell, index) => {
    const mark = gameState.board[index];
    cell.textContent = mark;
    cell.classList.toggle("mark-x", mark === "X");
    cell.classList.toggle("mark-o", mark === "O");
    cell.classList.toggle(
      "winning-cell",
      Boolean(winningCombination?.includes(index)),
    );
    cell.setAttribute(
      "aria-label",
      `Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}, ${mark || "empty"}`,
    );
  });

  if (isGameOver() && role !== "spectator") {
    const nextResultKey = `${gameState.board.join("")}:${gameState.winner || "draw"}`;
    if (resultKey !== nextResultKey) {
      resultKey = nextResultKey;
      resultTitle.textContent = statusText;
      winScreen.hidden = false;
    }
  } else {
    resultKey = null;
    winScreen.hidden = true;
  }

  updateControls();
}

function sendMessage(message) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    connectionStatus.textContent =
      "Game server is unavailable. Run npm start in the project folder; reconnecting...";
    return;
  }

  ws.send(JSON.stringify(message));
}

function handleMessage(event) {
  let data;
  try {
    data = JSON.parse(event.data);
  } catch {
    connectionStatus.textContent = "Received an invalid message from the server.";
    return;
  }

  if (data.type === "state") {
    gameState = data.gameState;
    renderBoard();
  } else if (data.type === "role") {
    role = data.role;
    playerName = data.name;
    authenticated = true;
    loginForm.hidden = true;

    const roleName =
      role === "X" ? "Player X" : role === "O" ? "Player O" : "Spectator";
    roleElement.textContent = `Logged in as ${playerName} (${roleName})`;
    connectionStatus.textContent = "Connected to the game server.";
    renderBoard();
  } else if (data.type === "error") {
    connectionStatus.textContent = data.message;
    joinButton.disabled = ws.readyState !== WebSocket.OPEN || authenticated;
  }
}

function connectToServer() {
  try {
    ws = new WebSocket(getWebSocketUrl());
  } catch {
    connectionStatus.textContent =
      "Could not open a game-server connection. Start it with npm start and reload this page.";
    return;
  }

  ws.addEventListener("open", () => {
    connectionStatus.textContent = "Connected to the game server.";
    updateControls();
  });

  ws.addEventListener("close", () => {
    authenticated = false;
    loginForm.hidden = false;
    roleElement.textContent = "Disconnected from the game.";
    connectionStatus.textContent =
      "Game server unavailable. Run npm start in the project folder; retrying...";
    updateControls();
    window.setTimeout(connectToServer, 1500);
  });

  ws.addEventListener("error", () => {
    connectionStatus.textContent =
      "Could not connect. Run npm start in the project folder; retrying...";
  });

  ws.addEventListener("message", handleMessage);
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage({
    type: "login",
    name: nameInput.value.trim(),
    password: passwordInput.value,
  });
});

loginHintToggle.addEventListener("click", () => {
  const isExpanded = loginHintToggle.getAttribute("aria-expanded") === "true";
  loginHintToggle.setAttribute("aria-expanded", String(!isExpanded));
  loginHint.hidden = isExpanded;
});

cells.forEach((cell, index) => {
  cell.addEventListener("click", () => {
    sendMessage({ type: "place", index });
  });
});

function resetGame() {
  sendMessage({ type: "reset" });
}

resetButton.addEventListener("click", resetGame);
playAgainButton.addEventListener("click", resetGame);

connectToServer();
updateControls();
