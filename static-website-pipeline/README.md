# AWS Static Website Pipeline
An AWS Pipeline for a Static Website, built using the AWS Typescript CDK.

Enter your Project Name, Region and AWS Account Number in `main.ts`.

Your Project's CodeCommit Repository must already exist before running `cdk deploy`.

## Prerequisites
Install or update the [AWS CDK CLI] from npm (requires [Node.js ≥ 8.11.x](https://nodejs.org/en/download)):

```bash
$ npm i -g aws-cdk
```

# Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
