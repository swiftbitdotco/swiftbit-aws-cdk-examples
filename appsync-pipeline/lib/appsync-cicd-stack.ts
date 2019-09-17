import core = require('@aws-cdk/core');
import sns = require('@aws-cdk/aws-sns');
import codepipeline = require('@aws-cdk/aws-codepipeline');

import { CodeCommitRepositoryFactory } from './codecommit-repository-factory'
import { CodePipelineFactory } from './codepipeline-factory';
import { CodeBuildRoleFactory } from './codebuildrole-factory';
import { CodePipelineStageFactory as CodePipelineStageFactory } from './codepipeline-stage-factory';
//import { WebsiteBucketFactory } from './website-bucket-factory';
import { ProjectName } from './ProjectName';

export class AppSyncCiCdStack extends core.Stack {
    constructor(
        scope: core.App,
        existingRepoName: string,
        projectName: ProjectName,
        props: core.StackProps
    ) {
        let id = projectName.toPascalCase + "PipelineStack";
        super(scope, id, props);

        // notifications for the PR changes and events from the build project(s)
        const notificationTopic = new sns.Topic(this, projectName.toPascalCase + 'PipelineTopic')

        // the code commit repository
        var repoFactory = new CodeCommitRepositoryFactory();
        const codeCommitRepo = repoFactory.create(this, existingRepoName, projectName, notificationTopic);
        // artifacts from the code commit repository (i.e. the git checkout of the codebase)
        var sourceArtifactName = projectName.toKebabCase + "-source-artifacts"
        const sourceOutput = new codepipeline.Artifact(sourceArtifactName);
        new core.CfnOutput(this, 'CodePipelineSourceArtifacts', { value: sourceOutput.artifactName || sourceArtifactName });



        // the stages of the pipeline (code build projects)
        var stageFactory = new CodePipelineStageFactory();
        // stage 1 - git source
        var sourceStage = stageFactory.createSourceStage(projectName, 'dev', codeCommitRepo, sourceOutput)
        // role for the code build projects
        let codebuildRole = CodeBuildRoleFactory.create(this, projectName);
        // stage 2 - DEV
        var stage1Props = {
            environment: 'dev',
            websiteBucketName: 'dev.swiftbitsolutions.com'
        }
        //WebsiteBucketFactory.createIfNotExists(this, stage1Props)
        let stage1 = stageFactory.create(this, projectName, sourceOutput, /*null,*/ stage1Props, codebuildRole, notificationTopic, false);
        // stage 3 - PROD
        var stage2Props = {
            environment: 'prod',
            websiteBucketName: 'prod.swiftbitsolutions.com'
        }
        //WebsiteBucketFactory.createIfNotExists(this, stage2Props)
        let stage2 = stageFactory.create(this, projectName, sourceOutput, /*null,*/ stage2Props, codebuildRole, notificationTopic, true);
        // add all stages together
        let stages = [sourceStage, stage1, stage2];

        // the pipeline
        var codePipelineFactory = new CodePipelineFactory();
        const pipeline = codePipelineFactory.create(this, projectName, stages)
    }
}