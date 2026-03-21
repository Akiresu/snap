# =============================================================================
# Snap — Development Container
# Base: Official Playwright Node image (includes Node.js LTS + all browsers)
# =============================================================================
FROM mcr.microsoft.com/playwright:v1.58.0-noble

LABEL maintainer="Akiresu"
LABEL description="Snap dev environment — Playwright, Node.js"

# Avoid interactive prompts during package install
ENV DEBIAN_FRONTEND=noninteractive

# --- System dependencies ---
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    jq \
    vim \
    && rm -rf /var/lib/apt/lists/*

# --- Working directory ---
WORKDIR /app

# --- Default entrypoint keeps container alive for interactive dev ---
# Override in docker-compose for specific run commands
ENTRYPOINT ["tail", "-f", "/dev/null"]
