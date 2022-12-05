FROM node:18-buster AS builder
WORKDIR /usr/src/app
COPY package*.json .
COPY frontend/package*.json frontend/
ARG NODE_ENV=development
RUN npm install && cd frontend && npm install
ARG GITHUB_KEY
RUN git clone https://andrew-healey:$GITHUB_KEY@github.com/andrew-healey/shift-refactor.git \
  && cd shift-refactor \
	&& rm -rf .git \
	&& npm ci \
	&& npm run build-all \
	&& cd .. \
	&& npm link ./shift-refactor
COPY tsconfig.json .
COPY frontend/ frontend/
COPY src/ src/
RUN npm run build

FROM node:18-alpine3.16
WORKDIR /root/app
COPY package*.json .
RUN mkdir frontend
COPY --from=builder /usr/src/app/dist/ dist
COPY --from=builder /usr/src/app/node_modules/ node_modules
COPY --from=builder /usr/src/app/shift-refactor/ node_modules/shift-refactor
COPY frontend/public frontend/public

EXPOSE 9229

ENTRYPOINT ["npm","start"]