FROM node:22-alpine

WORKDIR /app

# Copy prisma schema first for caching
COPY prisma ./prisma
COPY package.json ./
COPY backend/package.json ./backend/

# Install root deps (prisma) and backend deps
RUN npm install --ignore-scripts && \
    cd backend && npm install

# Generate prisma client
RUN npx prisma generate --schema=prisma/schema.prisma

# Copy backend source
COPY backend ./backend

# Build backend
RUN cd backend && npm run build

EXPOSE 4000

# Copy seed script
COPY prisma/seed.ts ./prisma/

# Wait for postgres, then run migrations, seed, and start
CMD sh -c "until nc -z postgres 5432; do echo 'Waiting for postgres...'; sleep 2; done && npx prisma migrate deploy --schema=prisma/schema.prisma && npx tsx prisma/seed.ts && node backend/dist/index.js"
