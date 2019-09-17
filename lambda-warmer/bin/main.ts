#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import { LambdaWarmerStack } from '../lib/lambda-warmer-stack';

const app = new cdk.App();

// enter your region and account # here...
// note: the account should be a "DevOps" or "tools" account
new LambdaWarmerStack(app, 'LambdaWarmerStack', 'your-lambda-arn', {
    env: {
        region: 'eu-west-1',
        account: 'your-account-id'
    }
});