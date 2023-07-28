# Audit Bazaar Backend

# Node.js Express Application

> Backend Node.js Express API with TypeScript 4. Supports MongoDB

## Description

This is the backend service for the project titled Audit Bazzar.

### Project Introduction

- suppot ES6/ES7 features

## Features

##### Authentication:

- jwt authentication

##### Session Storage:

- MongoDB

##### Integration testing

- chai
- supertest

## Requirements

- node >= 16
- npm >= 9
- mongodb >= 4.0
- typescript >= 4.0

## Installation

```bash
# Example installation steps:
git clone <repository-url>
npm install
```

## App skeleton

```
.
├── Backend
|   ├── README.md
|   ├── .gitignore
|   ├── package.json
|   ├── src
|   │   ├── constant
|   │   │   └── configLocal.ts
|   │   ├── constant
|   │   │   └── response.ts
|   │   ├── controllers
|   │   │   ├── main
|   │   │   │   ├── controller.ts
|   │   │   │   ├── postControl.ts
|   │   │   │   └── router.controller.ts
|   │   │   └── healthCheck.controller.ts.ts
|   │   ├── helpers
|   │   │   ├── db.helper.ts
|   │   │   └── mailHelper.ts
|   │   ├── middlewares
|   │   │   └── jwtValidate.ts
|   │   ├── models
|   │   │   ├── posts.model.ts
|   │   │   └── user.model.ts
|   │   ├── test
|   │   │   └── userController.test.ts
|   │   ├── utils
|   │   │   └── message.ts
|   │   ├── index.ts
|   │   ├── router.ts
|   │   └── server.ts
|   ├── babel.config.js
|   ├── example.env
|   ├── Dockerfile
|   └── tsconfig.json
└── docker-compose.yaml
```

## Running the API

### Development

To start the application in development mode, run:

```bash
npm start
```

Note: Also check the required example.env/.env file.

Express server listening on http://localhost:9000/api/v1, in development mode
The developer mode will watch your changes then will transpile the TypeScript code and re-run the node application automatically.

### Testing

To run integration tests:

```bash
npx jest
```

## Set up environment

In Backend folder you can find `example.env`. You can use this config and change it and add it to a `.env` file for your purposes.
If you want to add some new variables, you also need to add them to config object in config folder

## Run Backend on Docker

In root folder you can find `docker-compose.yaml` file. You can use this file and run the backend service in a docker container using command:

```bash
docker-compose build && docker-compose up -d
```

## Swagger Usage

Swagger documentation will be available on route:

```bash
http://localhost:9000/swagger
```
