FROM node:18-buster AS builder
WORKDIR /usr/src/app
COPY package*.json .
ARG NODE_ENV=development
RUN npm install
ARG GITHUB_KEY
RUN git clone https://andrew-healey:$GITHUB_KEY@github.com/andrew-healey/shift-refactor.git \
  && cd shift-refactor \
	&& rm -rf .git \
	&& npm ci \
	&& npm run build-all \
	&& cd .. \
	&& npm link ./shift-refactor
COPY tsconfig.json .
COPY src/ src/
RUN npm run build

FROM node:18-alpine3.16
WORKDIR /root/app
COPY package*.json .
COPY --from=builder /usr/src/app/dist/ dist
COPY --from=builder /usr/src/app/node_modules/ node_modules
COPY --from=builder /usr/src/app/shift-refactor/ node_modules/shift-refactor

ENTRYPOINT ["npm","start"]