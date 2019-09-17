#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import { AppSyncStack } from '../lib/appsync-stack';

const app = new cdk.App();

// enter your region and account # here...
// note: the account should be a "DevOps" or "tools" account
new AppSyncStack(app, 'AppSyncStack', 'TestAppSync', {
    env: {
        region: 'eu-west-1',
        account: 'your-account-id'
    }
});