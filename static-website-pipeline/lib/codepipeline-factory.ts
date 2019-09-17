import changecase = require('change-case');

import core = require('@aws-cdk/core');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import iam = require('@aws-cdk/aws-iam');

export class CodePipelineFactory {
    public create(
        scope: core.Construct,
        projectName: string,
        stages: codepipeline.StageProps[]
    ): codepipeline.IPipeline {
        // role for the pipeline
        let roleName = changecase.pascal(`${projectName} pipeline role`);
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
        const outputName1 = changecase.pascal(`${roleName} name`);
        new core.CfnOutput(scope, outputName1, { value: pipelineRole.roleName });

        // the pipeline
        let pipelineName = changecase.pascal(`${projectName} pipeline`);
        var pipe = new codepipeline.Pipeline(scope, pipelineName, {
            pipelineName: pipelineName,
            role: pipelineRole
        });

        stages.forEach(stage => {
            pipe.addStage(stage);
        });

        const outputName2 = changecase.pascal(`${pipelineName} name`);
        new core.CfnOutput(scope, outputName2, { value: pipe.pipelineName });

        return pipe;
    }
}