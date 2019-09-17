import core = require('@aws-cdk/core');
import iam = require('@aws-cdk/aws-iam');
import { ProjectName } from './ProjectName';

export class CodeBuildRoleFactory {
    public static create(
        scope: core.Construct,
        projectName: ProjectName,
    ): iam.Role {
        // role for codebuild
        var roleName = projectName.toPascalCase + 'CodeBuildRole';
        let codebuildRole = new iam.Role(scope, roleName,
            {
                roleName: roleName,
                //list of aws service principals: https://gist.github.com/shortjared/4c1e3fe52bdfa47522cfe5b41e5d6f22
                assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
            });
        codebuildRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
        new core.CfnOutput(scope, 'CodeBuildRole', { value: codebuildRole.roleName });

        return codebuildRole;
    }
}