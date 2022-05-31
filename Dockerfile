FROM node:10.14-alpine
ENV SCONE_HEAP=1G
ENV SCONE_FORK=1
WORKDIR /app

COPY package*.json /app/

RUN npm install --production
COPY . /app/

EXPOSE 3000
CMD SCONE_VERSION=1 node dist/index.js
