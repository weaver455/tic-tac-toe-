# Multiplayer Tic-Tac-Toe

Reston Weaver

**Course:** CS: 310 - Introduction to Web Development

**Live game:** _Add the Render deployment URL here after deployment._


## Play the Game

Open the live Render link above and enter a name and the game password:

**Password:** `secret123`

The first authenticated player becomes Player X, and the second becomes Player O. Additional players join as spectators. Open the game in two browser windows or on two devices to test multiplayer play.

## Run Locally

Requirements: Node.js and npm

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

## Deploy to Render

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Environment variable: `GAME_PASSWORD=secret123`

