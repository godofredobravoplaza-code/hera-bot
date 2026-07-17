FROM node:lts-slim

# Instalar dependencias para Chromium (necesario para Puppeteer)
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libgbm-dev \
    libnss3 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libpango-1.0-0 \
    libcairo2 \
    libxfixes3 \
    libxi6 \
    libxcursor1 \
    libxext6 \
    libxrender1 \
    libxtst6 \
    libgtk-3-0 \
    libx11-xcb1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar archivos de dependencias e instalar
COPY package*.json ./
RUN npm install

# Copiar código fuente
COPY . .

# Exponer el puerto del servidor ping
EXPOSE 3000

# Iniciar la aplicación
CMD ["node", "index.js"]
