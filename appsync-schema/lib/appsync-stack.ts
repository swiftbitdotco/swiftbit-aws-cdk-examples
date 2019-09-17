import fs = require('fs');
import core = require('@aws-cdk/core');
import appsync = require('@aws-cdk/aws-appsync');
import { CfnOutput } from '@aws-cdk/core';
import changecase = require('change-case');

export class AppSyncStack extends core.Stack {
    constructor(
        scope: core.App,
        id: string,
        projectName: string,
        props: core.StackProps
    ) {
        super(scope, id, props);

        const projectNamePascalCase = changecase.pascal(projectName);

        // first create the API

        var api = this.createApi(projectNamePascalCase);

        // var apiKey = new appsync.CfnApiKey(this, 'TestAppSyncApiKey', {
        //     apiId: api.attrApiId,
        //     description: `An API key for ${apiId}`,
        //     // TODO: expires: ??? // unix epoch timestamp. max value is 365 days from now
        // });

        // 2) then create the schema (read from file)
        var schema = this.createSchema(projectNamePascalCase, api);
    }

    createApi(projectNamePascalCase: string): appsync.CfnGraphQLApi {
        // NOTE: Security configuration for your GraphQL API. 
        // For allowed values (such as API_KEY, AWS_IAM, or AMAZON_COGNITO_USER_POOLS, OPENID_CONNECT), 
        // see "Security" in the AWS AppSync Developer Guide. 
        const authType = 'API_KEY'
        const apiLogicalId = projectNamePascalCase + 'Api';
        const api = new appsync.CfnGraphQLApi(this, apiLogicalId, {
            name: apiLogicalId,
            authenticationType: authType
        });
        new CfnOutput(this, 'ApiAttrApiId', {
            description: 'The APIs\' unique id to define itself to other AWS Resources (i.e. a GraphQLSchema)',
            value: api.attrApiId
        });
        new CfnOutput(this, 'ApiLogicalId', {
            description: 'The APIs\' logical id in AWS Cloudformation and Cloudformation templates',
            value: api.logicalId
        });
        new CfnOutput(this, 'ApiName', {
            description: 'The APIs\' name in AWS Cloudformation and Cloudformation templates',
            value: api.name
        });

        return api;
    }

    createSchema(projectNamePascalCase: string, api: appsync.CfnGraphQLApi): appsync.CfnGraphQLSchema {
        const schemaString = fs.readFileSync('~/../schema.graphql', {
            encoding: 'utf8',
            flag: 'r'
        });
        const appSyncSchema = new appsync.CfnGraphQLSchema(this, projectNamePascalCase + 'Schema', {
            apiId: api.attrApiId,
            definition: schemaString
        });
        new CfnOutput(this, 'SchemaApiId', {
            description: 'The API id that the schema is connected to',
            value: appSyncSchema.apiId
        });
        new CfnOutput(this, 'SchemaLogicalId', {
            description: 'The schemas\' logical id in AWS Cloudformation and Cloudformation templates',
            value: appSyncSchema.logicalId
        });

        return appSyncSchema;
    }
}
