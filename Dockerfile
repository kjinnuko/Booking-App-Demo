# tiny production image for the Express app
FROM node:20-alpine

# set workdir
WORKDIR /usr/src/app

# copy manifests first for cached installs
COPY package*.json ./

# install deps (use `npm ci` if you have package-lock.json)
RUN npm install --production --silent

# copy app sources
COPY . .

# use non-root user from the official image
USER node

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# run the server file
CMD ["node", "server.js"]