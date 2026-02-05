# Rollback Guide

## Strategy: Revert

If v0.3.0 fails:

1.  **Stop Server**: `Ctrl+C` or `pm2 stop aixuexi-server`.
2.  **Revert Code**:
    ```bash
    git reset --hard v0.2.0
    # OR if v0.2.0 tag missing
    git reset --hard HEAD^
    ```
3.  **Restore DB** (If schema corrupted):
    *   Restore `data/user_stats.db` from backup `data/user_stats.db.bak` (if created).
4.  **Restart**:
    ```bash
    npm start
    ```
