import changecase = require('change-case');

import core = require('@aws-cdk/core');
import iam = require('@aws-cdk/aws-iam');

export class CodeBuildRoleFactory {
    public static create(
        scope: core.Construct,
        projectName: string,
    ): iam.Role {
        // role for codebuild
        var roleName = changecase.pascal(`${projectName} code build role`);
        let codebuildRole = new iam.Role(scope, roleName,
            {
                roleName: roleName,
                //list of aws service principals: https://gist.github.com/shortjared/4c1e3fe52bdfa47522cfe5b41e5d6f22
                assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
            });
        codebuildRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
        new core.CfnOutput(scope, changecase.pascal(`${roleName} name`), { value: codebuildRole.roleName });

        return codebuildRole;
    }
}