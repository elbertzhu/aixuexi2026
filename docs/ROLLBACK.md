# Rollback Guide

## Scenario 1: Server Crash / Instability
1.  **Stop Server**: `Ctrl+C` or `pkill node`.
2.  **Revert Code**:
    ```bash
    git reset --hard v0.4.0
    ```
3.  **Restore Dependencies**:
    ```bash
    cd server && npm install
    ```
4.  **Restart**:
    ```bash
    npm start
    ```

## Scenario 2: DB Corruption
*Data loss is possible if v0.4.1 introduced schema changes that failed midway.*
1.  Stop Server.
2.  Restore Backup:
    ```bash
    cp data/user_stats.db.bak data/user_stats.db
    ```
    *(Note: Backups are manual. Ensure `data/` is included in backup scripts).*

## Scenario 3: AI Provider Issues (Regional/Limit)
**Downgrade AI to Mock Mode**:
1.  Edit `.env`:
    ```
    AI_PROVIDER=mock
    ```
2.  Restart Server.
