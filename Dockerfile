FROM node:23 AS build
WORKDIR /app
COPY PPlaneShareFrontend/package.json PPlaneShareFrontend/package-lock.json ./
RUN npm install
COPY PPlaneShareFrontend/ .
RUN npm run build

FROM node:23 AS backend
WORKDIR /app
COPY --from=build /app/dist /app/public
COPY PPlaneShareBackend/package.json PPlaneShareBackend/package-lock.json ./
RUN npm install
COPY PPlaneShareBackend/ .
EXPOSE 42100
CMD ["npm", "start"]