#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import { AppSyncCiCdStack } from '../lib/appsync-cicd-stack';
import { ProjectName } from '../lib/ProjectName';

const app = new cdk.App();

// the name of your project, separated by spaces...
var projectName = new ProjectName("Gray Dragon AppSync Pipeline");
var existingRepoName = 'GrayDragonAppSyncRepository';

// enter your region and account # here...
// note: the account should be a "DevOps" or "tools" account
new AppSyncCiCdStack(app, existingRepoName, projectName, {
    env: {
        region: 'eu-west-1',
        account: 'your-account-id'
    }
});