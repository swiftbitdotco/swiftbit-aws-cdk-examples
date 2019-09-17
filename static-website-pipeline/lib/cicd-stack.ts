import changecase = require('change-case');

import core = require('@aws-cdk/core');
import sns = require('@aws-cdk/aws-sns');
import codepipeline = require('@aws-cdk/aws-codepipeline');

import { CodeCommitRepositoryFactory } from './codecommit-repository-factory'
import { CodePipelineFactory } from './codepipeline-factory';
import { CodeBuildRoleFactory } from './codebuildrole-factory';
import { CodePipelineStageFactory as CodePipelineStageFactory, IBuildAndDeployRun, IStageAction, BuildOrDeploy } from './codepipeline-stage-factory';
//import { WebsiteBucketFactory } from './website-bucket-factory';

// TODO's
// link domain to s3 website bucket

export class PipelineStack extends core.Stack {
    constructor(
        scope: core.App,
        existingRepoName: string,
        projectName: string,
        props: core.StackProps
    ) {
        const id = changecase.pascal(`${projectName} pipeline stack`);
        super(scope, id, props);

        // notifications for the PR changes and events from the build project(s)
        const notificationTopic = new sns.Topic(this, changecase.pascal(`${projectName} pipeline topic`))

        // the code commit repository
        const repoFactory = new CodeCommitRepositoryFactory();
        const codeCommitRepo = repoFactory.create(this, existingRepoName, projectName, notificationTopic);



        // the stages of the pipeline (code build projects)
        const stageFactory = new CodePipelineStageFactory();
        // stage 1 - git source
        const stageSourceResult = stageFactory.createSourceStage(this, projectName, 'dev', codeCommitRepo)
        // role for the code build projects
        const codebuildRole = CodeBuildRoleFactory.create(this, projectName);


        // BUILD ONCE
        const runBuildOnce: IStageAction = {
            projectName,
            artifactsIn: stageSourceResult.artifacts,
            buildSpecLocation: '_codebuild/build.once.yml',
            actionName: `build ${projectName}`,
            environment: '',
            codebuildRole: codebuildRole,
            notificationsTopic: notificationTopic,
            hasManualApproval: false
        };


        const stageBuildOnceResult = stageFactory.createSingleRun(
            this,
            'build',
            runBuildOnce,
            BuildOrDeploy.Build
        );


        // Deploy to DEV
        const deployToDevInfo: IStageAction = {
            projectName,
            artifactsIn: stageBuildOnceResult.artifacts,
            environment: 'dev',
            actionName: 'deploy to dev',
            buildSpecLocation: '_codebuild/deploy.dev.yml',
            codebuildRole: codebuildRole,
            notificationsTopic: notificationTopic,
            hasManualApproval: false
        }

        const stageDeployToDev = stageFactory.createSingleRun(
            this,
            'deploy dev website',
            deployToDevInfo,
            BuildOrDeploy.Deploy
        );

        // Deploy to UAT1
        const deployToUat1Info: IStageAction =
        {
            projectName,
            artifactsIn: stageBuildOnceResult.artifacts,
            environment: 'uat1',
            actionName: 'deploy to uat1',
            buildSpecLocation: '_codebuild/deploy.uat1.yml',
            codebuildRole: codebuildRole,
            notificationsTopic: notificationTopic,
            hasManualApproval: true
        }

        // Deploy to UAT2
        const deployToUat2Info: IStageAction =
        {
            projectName,
            artifactsIn: stageBuildOnceResult.artifacts,
            environment: 'uat2',
            actionName: 'deploy to uat2',
            buildSpecLocation: '_codebuild/deploy.uat2.yml',
            codebuildRole: codebuildRole,
            notificationsTopic: notificationTopic,
            hasManualApproval: true
        }

        const stageDeployToUatStages = stageFactory.createParallelRun(
            this,
            'deploy uat websites',
            [
                deployToUat1Info,
                deployToUat2Info
            ],
            BuildOrDeploy.Deploy
        );

        // stage PROD
        const deployToProd = stageFactory.createSingleRun(this,
            'deploy prod website',
            {
                projectName,
                artifactsIn: stageBuildOnceResult.artifacts,
                environment: 'prod',
                actionName: 'deploy to prod',
                buildSpecLocation: '_codebuild/deploy.prod.yml',
                codebuildRole: codebuildRole,
                notificationsTopic: notificationTopic,
                hasManualApproval: true
            },
            BuildOrDeploy.Deploy
        );


        // add all stages together
        const stages: codepipeline.StageProps[] = [
            stageSourceResult.stageProps,
            stageBuildOnceResult.stageProps,
            stageDeployToDev.stageProps,
            stageDeployToUatStages,
            deployToProd.stageProps
        ];

        // create the pipeline
        const codePipelineFactory = new CodePipelineFactory();
        const pipeline = codePipelineFactory.create(this, projectName, stages)
    }
}