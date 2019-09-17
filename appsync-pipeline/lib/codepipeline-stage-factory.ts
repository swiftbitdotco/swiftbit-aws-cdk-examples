import changecase = require('change-case');

import core = require('@aws-cdk/core');
import codecommit = require('@aws-cdk/aws-codecommit');
import codebuild = require('@aws-cdk/aws-codebuild');
import sns = require('@aws-cdk/aws-sns');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import iam = require('@aws-cdk/aws-iam');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import targets = require('@aws-cdk/aws-events-targets');

import { IEnvironmentAndWebsiteName } from "./IEnvironmentAndWebsiteName";
import { ProjectName } from './ProjectName';

export class CodePipelineStageFactory {

    public createSourceStage(
        projectName: ProjectName,
        branchToMonitor: string,
        codecommitRepository: codecommit.IRepository,
        sourceOutput: codepipeline.Artifact
    ): codepipeline.StageProps {
        var stage: codepipeline.StageProps = {
            stageName: projectName.toPascalCase + 'Source',
            actions: [
                new codepipeline_actions.CodeCommitSourceAction({
                    branch: branchToMonitor,
                    actionName: projectName.toPascalCase + '_Source_Updated',
                    repository: codecommitRepository,
                    output: sourceOutput,
                }),
            ],
        };
        return stage
    }

    public create(
        scope: core.Construct,
        projectName: ProjectName,
        websiteSourceArtifacts: codepipeline.Artifact,
        //uiTestSourceArtifacts: codepipeline.Artifact,
        props: IEnvironmentAndWebsiteName,
        codebuildRole: iam.Role,
        notificationsTopic: sns.Topic,
        hasManualApproval: boolean
    ): codepipeline.StageProps {
        const envNamePascalCase = changecase.pascal(props.environment);

        // the artifacts for (3x = build, deploy, ui test)
        let buildArtifacts = this.createArtifacts(scope, projectName.toPascalCase + envNamePascalCase + 'BuildArtifacts', projectName.toKebabCase + '-' + props.environment + '-build-artifacts');
        let deployArtifacts = this.createArtifacts(scope, projectName.toPascalCase + envNamePascalCase + 'DeployArtifacts', projectName.toKebabCase + '-' + props.environment + '-deploy-artifacts');
        //let uiTestArtifacts = this.createArtifacts(scope, projectName.toPascalCase + envNamePascalCase + 'UiTestArtifacts', projectName.toKebabCase + '-' + props.environment +'-uitest-artifacts');

        // the projects for (3x = build, deploy, ui test)
        var buildProject = this.createBuildProject(scope, projectName, props, codebuildRole, notificationsTopic);
        var deployProject = this.createDeployProject(scope, projectName, props, codebuildRole, notificationsTopic);
        //var uiTestProject = this.createUiTestProject(scope, projectName, props, codebuildRole, notificationsTopic);




        // create actions array with just "build" action
        var actions: codepipeline.IAction[] = [
            new codepipeline_actions.CodeBuildAction({
                runOrder: 1,
                actionName: 'Build',
                project: buildProject,
                input: websiteSourceArtifacts,
                outputs: [buildArtifacts],
                type: codepipeline_actions.CodeBuildActionType.BUILD
            })
        ];

        let runOrder = 2;
        if (hasManualApproval) {
            actions.push(new codepipeline_actions.ManualApprovalAction({
                runOrder: runOrder,
                actionName: 'Approve' + envNamePascalCase + 'Deployment',
                notificationTopic: notificationsTopic, // optional
                // notifyEmails: [
                //     'someone@gmail.com',
                // ], // optional
                //additionalInformation: 'additional info', // optional
            }));
            runOrder++;
        }

        actions.push(new codepipeline_actions.CodeBuildAction({
            runOrder: runOrder,
            actionName: 'Deploy',
            project: deployProject,
            input: buildArtifacts,
            outputs: [deployArtifacts],
            type: codepipeline_actions.CodeBuildActionType.BUILD
        }))
        runOrder++;

        // TODO:
        // actions.push(new codepipeline_actions.CodeBuildAction({
        //     runOrder: runOrder,
        //     actionName: 'Run UI Tests',
        //     project: uiTestProject,
        //     input: uiTestSourceArtifacts,
        //     outputs: [uiTestArtifacts],
        //     type: codepipeline_actions.CodeBuildActionType.TEST
        // }));

        var stage: codepipeline.StageProps = {
            stageName: 'Build_And_Deploy_' + envNamePascalCase + '_Website',
            actions: actions
        };

        return stage;
    }

    private createArtifacts(scope: core.Construct, pascalName: string, kebabName: string): codepipeline.Artifact {
        const artifacts = new codepipeline.Artifact(kebabName);
        new core.CfnOutput(scope, pascalName, { value: artifacts.artifactName || kebabName });
        return artifacts;
    }

    private createBuildProject(
        scope: core.Construct,
        projectName: ProjectName,
        props: IEnvironmentAndWebsiteName,
        codebuildRole: iam.Role,
        notificationsTopic: sns.Topic
    ): codebuild.IProject {
        const envNamePascalCase = changecase.pascal(props.environment);
        const envLowerCase = changecase.lower(props.environment);
        const codebuildProjectName = 'Build' + projectName.toPascalCase + envNamePascalCase;

        let buildProject = new codebuild.PipelineProject(scope, codebuildProjectName, {
            projectName: codebuildProjectName,
            role: codebuildRole,
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: [
                            'npm install'
                        ],
                    },
                    pre_build: {
                        commands: [
                            'ls'
                            //'npm run test-once-with-coverage'
                        ]
                    },
                    build: {
                        commands: [
                            //'ls',
                            'npm run build-' + envLowerCase,
                        ]
                    }
                },
                artifacts: {
                    files: [
                        'dist_' + envLowerCase + '/**/*',
                        //'coverage/**/*'
                    ]
                },
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
            },
        });
        new core.CfnOutput(scope, 'Build' + envNamePascalCase + 'Project', { value: buildProject.projectName });

        // add "build failed" notification
        const buildFailedEventRule = projectName.toPascalCase + envNamePascalCase + 'BuildFailedEvent';
        buildProject.onBuildFailed(buildFailedEventRule,
            {
                description: 'Notify Developers of Failed Builds',
                ruleName: buildFailedEventRule,
                target: new targets.SnsTopic(notificationsTopic)
            });
        // TODO: better naming
        new core.CfnOutput(scope, envNamePascalCase + 'BuildFailedEvent', { value: buildFailedEventRule });

        return buildProject;
    }

    private createDeployProject(
        scope: core.Construct,
        projectName: ProjectName,
        props: IEnvironmentAndWebsiteName,
        codebuildRole: iam.Role,
        notificationsTopic: sns.Topic
    ): codebuild.IProject {
        const envNamePascalCase = changecase.pascal(props.environment);
        const envLowerCase = changecase.lower(props.environment);
        const codebuildProjectName = 'Deploy' + projectName.toPascalCase + envNamePascalCase;

        let deployProject = new codebuild.PipelineProject(scope, codebuildProjectName, {
            projectName: codebuildProjectName,
            role: codebuildRole,
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    build: {
                        commands: [
                            'aws s3 sync --delete dist_' + envLowerCase + ' "s3://' + props.websiteBucketName + '" --acl public-read'
                        ]
                    }
                }
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
            },
        });
        new core.CfnOutput(scope, 'Deploy' + envNamePascalCase + 'Project', { value: deployProject.projectName });

        // add "deployment failed" notification
        const deployFailedEventRule = projectName.toPascalCase + envNamePascalCase + 'DeployFailedEvent';
        deployProject.onBuildFailed(deployFailedEventRule,
            {
                description: 'Notify Developers of Failed Deployments',
                ruleName: deployFailedEventRule,
                target: new targets.SnsTopic(notificationsTopic)
            });
        // TODO: better naming
        new core.CfnOutput(scope, envNamePascalCase + 'DeployFailedEvent', { value: deployFailedEventRule });

        return deployProject;
    }

    private createUiTestProject(
        scope: core.Construct,
        projectName: ProjectName,
        props: IEnvironmentAndWebsiteName,
        codebuildRole: iam.Role,
        notificationsTopic: sns.Topic
    ): codebuild.IProject {
        const envNamePascalCase = changecase.pascal(props.environment);
        const envLowerCase = changecase.lower(props.environment);
        const codebuildProjectName = 'Test' + projectName.toPascalCase + envNamePascalCase;

        let testProject = new codebuild.PipelineProject(scope, codebuildProjectName, {
            projectName: codebuildProjectName,
            role: codebuildRole,
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    build: {
                        commands: [
                            'ls'
                            // TODO
                        ]
                    }
                }
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
            },
        });
        new core.CfnOutput(scope, 'Test' + envNamePascalCase + 'Project', { value: testProject.projectName });

        // add "tests failed" notification
        const testsFailedEventRule = projectName.toPascalCase + envNamePascalCase + 'TestsFailedEvent';
        testProject.onBuildFailed(testsFailedEventRule,
            {
                description: 'Notify Developers of Failed Tests',
                ruleName: testsFailedEventRule,
                target: new targets.SnsTopic(notificationsTopic)
            });
        // TODO: better naming
        new core.CfnOutput(scope, envNamePascalCase + 'TestsFailedEvent', { value: testsFailedEventRule });

        return testProject;
    }
}