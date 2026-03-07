# Server-wide configuration for log/artifact retention.
# Values here can be adjusted by dev/admin without touching app code.

# Number of most recent session logs to keep; older logs are deleted on startup.
MAX_SESSION_LOGS = 5

# Number of most recent quality test artifact directories to keep.
MAX_QUALITY_ARTIFACTS = 5
