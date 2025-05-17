FROM node:16-alpine

# Add build argument to force rebuilds
ARG REBUILD_TRIGGER=1

# Disable npm cache
ENV NPM_CONFIG_CACHE=/tmp/npm-cache

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Force browser to reload by disabling cache
ENV REACT_APP_CACHE_BUSTER=${REBUILD_TRIGGER}

EXPOSE 3000

CMD ["npm", "start"] 