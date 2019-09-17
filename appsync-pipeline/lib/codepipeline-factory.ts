import core = require('@aws-cdk/core');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import iam = require('@aws-cdk/aws-iam');
import { ProjectName } from './ProjectName';

export class CodePipelineFactory {
    public create(
        scope: core.Construct,
        projectName: ProjectName,
        stages: codepipeline.StageProps[]
    ): codepipeline.IPipeline {
        // role for the pipeline
        let roleName = projectName.toPascalCase + 'PipelineRole';
        let pipelineRole = new iam.Role(scope, roleName,
            {
                roleName: roleName,
                //list of aws service principals: https://gist.github.com/shortjared/4c1e3fe52bdfa47522cfe5b41e5d6f22
                assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com')
            });
        pipelineRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodeBuildAdminAccess'));
        pipelineRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodeDeployFullAccess'));
        pipelineRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodePipelineFullAccess'));
        pipelineRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
        new core.CfnOutput(scope, 'CodePipelineRoleName', { value: pipelineRole.roleName });

        // the pipeline
        var pipelineName = projectName.toPascalCase + 'Pipeline';
        var pipe = new codepipeline.Pipeline(scope, pipelineName, {
            pipelineName: pipelineName,
            role: pipelineRole
        });

        stages.forEach(stage => {
            pipe.addStage(stage);
        });

        new core.CfnOutput(scope, 'CodePipelineName', { value: pipe.pipelineName });

        return pipe;
    }
}