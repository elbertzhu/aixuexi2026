# Installation Guide

## Prerequisites
*   Node.js v18+
*   SQLite3

## Setup

1.  **Clone Repository**
    ```bash
    git clone https://github.com/elbertzhu/aixuexi2026.git
    cd aixuexi2026
    ```

2.  **Install Dependencies**
    ```bash
    cd server
    npm install
    ```

3.  **Start Server**
    ```bash
    npm start
    ```
    Server runs on `http://localhost:3000`.

## Environment Variables
Create `.env` in `server/`:
```
OPENROUTER_API_KEY=sk-or-vv-...
```
