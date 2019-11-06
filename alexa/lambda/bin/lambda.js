#!/usr/bin/env node

const cdk = require('@aws-cdk/core');
const { LambdaStack } = require('../lib/lambda-stack');
const AppConfig = require('../lib/appConfig.json') 

const app = new cdk.App();
new LambdaStack(app, AppConfig.stackName, { env: AppConfig.env });
