# Audit Bazaar Backend service
# Node.js Express Application




> Backend Node.js Express API with TypeScript 4. Supports MongoDB

## Description
This is the backend cron service for the project titled Audit Bazzar.

### Project Introduction
- support ES6/ES7 features

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
├── README.md
├── .gitignore
├── env.example
├── package.json
├── src
│   ├── config
│   │   └── configLocal.ts
│   ├── constant
│   │   └── response.ts
│   ├── controllers
│   │   ├── main
│   │   │   ├── arbiterControl.ts
│   │   │   ├── controller.ts
│   │   │   ├── jobsControl.ts
│   │   │   ├── postControl.ts
│   │   │   └── rouer.controller.ts
│   │   └── healthCheck.controller.ts.ts
│   ├── helpers
│   │   ├── db.helper.ts
│   │   ├── mailHelper.ts
│   │   ├── polkadotFunctionHelper.ts
│   │   └── txnVerification.helper.ts
│   ├── middlewares
│   │   └── jwtValidate.ts
│   ├── models
│   │   ├── jobs.model.ts
│   │   ├── posts.model.ts
│   │   └── user.model.ts
│   ├── test
│   │   ├── config.ts
│   │   └── userController.test.ts
│   ├── utils
│   │   └── message.ts
│   ├── index.ts
│   ├── router.ts
│   └── server.ts
├── babel.config.js
├── Dockerfile
├── swagger.json
├── tsconfig.json
```
## Running the API

## Set up environment
In root folder you can find `.env`. You can use this config or change it for your purposes.
If you want to add some new variables, you also need to add them to config object 

- Please follow to env.example file from the repo and replicate the same with your .env file

- Link for the mongodb server while deploying the application on an AWS/Azure/Google   will be the mongo db server link of the mongo db server deployed on the AWS/Azure/Google
Make sure the smart contracts are deployed on the main net before using the Server Instance, and add their addresses to the .env file once deployed.

- The 5 arbiters are statically declared for all the post for the time being. Feature for dynamizing the arbiters list for each arbitration can be added in the future. 

- Make sure you provide the secret key of the admin wallet in the .env file before proceeding to start the server

### Development

There are two ways to run project : 
 1. Docker
 2. npm

1. Docker 
 1.1 If docker already installed skip this step, otherwise visit the official docker installation guide : https://docs.docker.com/engine/install/
 1.2 after successfull installation, run following commands
    => sudo docker build -t audit-bazar-cron .
    => docker run -d -it audit-bazar-cron


2. To start the application in development mode, run:


```bash
npm start
```
Note: Also check the required .env file.


Express server listening on http://localhost:9000/api/v1, in development mode
The developer mode will watch your changes then will transpile the TypeScript code and re-run the node application automatically.

### Testing
To run integration tests:
```bash
npx jest
```

## Swagger Usage

Swagger documentation will be available on route:
```bash
http://localhost:9000/swagger/
```

