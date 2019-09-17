# Swiftbit Solutions Ltd - AWS CDK Examples

This repository contains a set of example projects for the [AWS Cloud Development
Kit](https://github.com/awslabs/aws-cdk).

## TypeScript examples

To run a TypeScript example, say my-widget-service:

```
$ npm install -g aws-cdk
$ cd my-widget-service
$ npm install
$ npm run build
$ cdk deploy  // Deploys the CloudFormation template

# Afterwards
$ cdk destroy
```

| Example | Description |
|---------|-------------|
| [appsync-pipeline](https://github.com/swiftbitdotco/swiftbit-aws-cdk-examples/tree/master/appsync-pipeline/) | Pipeline for AWS AppSync & it's other moving parts (WIP)  |
| [appsync-schema](https://github.com/swiftbitdotco/swiftbit-aws-cdk-examples/tree/master/appsync-schema/) | A simple AppSync API and GraphQL Schema, which is loaded from file on disk (WIP)  |
| [lambda-warmer](https://github.com/swiftbitdotco/swiftbit-aws-cdk-examples/tree/master/lambda-warmer/) | Runs a Lambda every 5 minutes Monday through Friday between 8:00 am and 5:55 pm (UTC)  |
| [static-website-hello-world-app](https://github.com/swiftbitdotco/swiftbit-aws-cdk-examples/tree/master/static-website-hello-world-app/) | A simple "Hello World" Angular Application that can be used with the **static-website-pipeline**, below |
| [static-website-pipeline](https://github.com/swiftbitdotco/swiftbit-aws-cdk-examples/tree/master/static-website-pipeline/) | AWS CodePipeline for a simple Angular Application (e.g. **static-website-hello-world-app**, above) |


