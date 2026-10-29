FROM node:24-bookworm-slim AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN cp nodes/Hirekal/hirekal.png dist/nodes/Hirekal/hirekal.png

FROM n8nio/n8n:2.42.0
USER root
RUN mkdir -p /opt/custom-nodes/n8n-nodes-hirekal
COPY --from=build /build/package.json /opt/custom-nodes/n8n-nodes-hirekal/package.json
COPY --from=build /build/dist /opt/custom-nodes/n8n-nodes-hirekal/dist
RUN chown -R node:node /opt/custom-nodes
USER node
ENV N8N_CUSTOM_EXTENSIONS=/opt/custom-nodes/n8n-nodes-hirekal
