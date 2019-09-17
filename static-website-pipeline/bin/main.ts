#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import { PipelineStack } from '../lib/cicd-stack';

const app = new cdk.App();

// the name of your project, separated by spaces...
var projectName = 'Hello World';
var existingRepoName = 'HelloWorldRepository';

// enter your region and account # here...
// note: the account should be a "DevOps" or "tools" account
new PipelineStack(app, existingRepoName, projectName, {
    env: {
        region: 'eu-west-1',
        account: '1234567890',
    }
});