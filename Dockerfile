# Portable image for the backend API. Works on Fly.io, Koyeb, Railway,
# Render (Docker), or any container host.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY tsconfig.json swaggerConfig.js ./
COPY src ./src
RUN npm install --no-audit --no-fund
RUN npm prune --omit=dev

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8888
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json /app/swaggerConfig.js ./
EXPOSE 8888
CMD ["node", "dist/server.js"]
