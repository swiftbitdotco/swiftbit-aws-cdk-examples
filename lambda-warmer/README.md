# AWS Lambda-Warmer
A Cloudwatch Lambda Warmer, firing every 5 minutes, built using the AWS Typescript CDK.

Enter your Region and AWS Account Number in `main.ts`.

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
