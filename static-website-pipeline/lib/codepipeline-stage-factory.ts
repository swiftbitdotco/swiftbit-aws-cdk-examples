import changecase = require('change-case');

import core = require('@aws-cdk/core');
import codecommit = require('@aws-cdk/aws-codecommit');
import codebuild = require('@aws-cdk/aws-codebuild');
import sns = require('@aws-cdk/aws-sns');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import iam = require('@aws-cdk/aws-iam');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import targets = require('@aws-cdk/aws-events-targets');

export enum BuildOrDeploy {
    Build,
    Deploy
}

export interface IBuildAndDeployRun {
    projectName: string,
    websiteSourceArtifacts: codepipeline.Artifact,
    environment: string;
    buildSpecLocation: string;
    codebuildRole: iam.Role,
    notificationsTopic: sns.Topic,
    hasManualApproval: boolean
}

export interface IStageAction {
    /**
     * The project name
     */
    projectName: string,

    /**
     * Artifacts for this stage
     */
    artifactsIn: codepipeline.Artifact,

    /**
     * The environment this stage is for
     */
    environment: string;

    /**
     * Name of the action in this stage: i.e. "Build Once", "Deploy to Dev1"
     */
    actionName: string;

    /**
     * Location of yaml file for this particular action
     */
    buildSpecLocation: string;

    codebuildRole: iam.Role,
    notificationsTopic: sns.Topic,
    hasManualApproval: boolean
}

export interface IStageActionResults {

    /**
     * Artifacts from this stage
     */
    artifacts: codepipeline.Artifact,

    /**
     * The stage for codepipeline
     */
    stageProps: codepipeline.StageProps
}

export interface IActionResult {
    artifacts: codepipeline.Artifact,
    actions: codepipeline.IAction[]
}

export class CodePipelineStageFactory {

    public createSourceStage(
        scope: core.Construct,
        projectName: string,
        branchToMonitor: string,
        codecommitRepository: codecommit.IRepository
    ): IStageActionResults {

        // artifacts from the code commit repository (i.e. the git checkout of the codebase)
        const sourceArtifactName = changecase.kebab(`${projectName} source artifacts`);
        const sourceOutput = new codepipeline.Artifact(sourceArtifactName);
        
        const outputName1 = changecase.pascal(`${sourceArtifactName} name`);
        new core.CfnOutput(scope, outputName1, { value: sourceOutput.artifactName || sourceArtifactName });


        const stageName = changecase.title(`${projectName} source code`).replace(/ /g, '_');
        const actionName = changecase.title(`${branchToMonitor} updated`).replace(/ /g, '_');
        const stage: codepipeline.StageProps = {
            stageName: stageName,
            actions: [
                new codepipeline_actions.CodeCommitSourceAction({
                    branch: branchToMonitor,
                    actionName: actionName,
                    repository: codecommitRepository,
                    output: sourceOutput,
                }),
            ],
        };


        return {
            stageProps: stage,
            artifacts: sourceOutput
        };
    }

    public createSingleRun(scope: core.Construct, stageName: string, run: IStageAction, buildOrDeploy: BuildOrDeploy): IStageActionResults {

        const result = this.createActionsFor(scope, run, buildOrDeploy);

        var stage: codepipeline.StageProps = {
            stageName: changecase.title(stageName).replace(/ /g, '_'),
            actions: result.actions
        };

        return {
            stageProps: stage,
            artifacts: result.artifacts
        };
    }

    public createParallelRun(
        scope: core.Construct,
        stageName: string,
        arr: IStageAction[],
        buildOrDeploy: BuildOrDeploy
    ): codepipeline.StageProps {

        var stageActions: codepipeline.IAction[] = [];

        arr.forEach(run => {
            var result = this.createActionsFor(scope, run, buildOrDeploy);

            result.actions.forEach(action => {
                stageActions.push(action);
            });
        });

        var stage: codepipeline.StageProps = {
            stageName: changecase.title(stageName).replace(/ /g, '_'),
            actions: stageActions
        };

        return stage;
    }

    createActionsFor(scope: core.Construct, run: IStageAction, buildOrDeploy: BuildOrDeploy): IActionResult {
        var actions: codepipeline.IAction[] = [];

        let name = changecase.pascal(`${run.projectName} ${run.environment} ${buildOrDeploy} artifacts`);
        let artifactsOut = this.createArtifacts(scope, name);

        var iProject: codebuild.IProject;

        if (buildOrDeploy === BuildOrDeploy.Build) {
            iProject = this.createBuildProject(
                scope,
                run.projectName,
                run.buildSpecLocation,
                run.codebuildRole,
                run.notificationsTopic
            );
        } else {
            iProject = this.createDeployProject(
                scope,
                run.projectName,
                run.environment,
                run.buildSpecLocation,
                run.codebuildRole,
                run.notificationsTopic
            );
        }

        let runOrder = 1;
        if (run.hasManualApproval) {

            let actionName = '';
            if (buildOrDeploy === BuildOrDeploy.Build) {
                actionName = 'approve build';
            } else {
                actionName = 'approve deployment';
            }

            actions.push(new codepipeline_actions.ManualApprovalAction({
                runOrder: runOrder,
                actionName: changecase.title(actionName).replace(/ /g, '_'),
                notificationTopic: run.notificationsTopic, // optional
                // notifyEmails: [
                //     'christopher.tumolo@retailmerchantservices.co.uk',
                // ], // optional
                //additionalInformation: 'additional info', // optional
            }));
            runOrder++;
        }

        // add "build" action
        actions.push(new codepipeline_actions.CodeBuildAction({
            runOrder: runOrder,
            actionName: changecase.title(run.actionName).replace(/ /g, '_'),
            project: iProject,
            input: run.artifactsIn,
            outputs: [artifactsOut],
            type: codepipeline_actions.CodeBuildActionType.BUILD
        }))

        return {
            actions: actions,
            artifacts: artifactsOut
        };
    }


    private createArtifacts(scope: core.Construct, name: string): codepipeline.Artifact {
        let artifactName = changecase.kebab(name);
        let outputName = changecase.pascal(`${name} name`);
        const artifacts = new codepipeline.Artifact(artifactName);
        new core.CfnOutput(scope, outputName, { value: artifacts.artifactName || artifactName });
        return artifacts;
    }

    private createBuildProject(
        scope: core.Construct,
        projectName: string,
        buildSpecLocation: string,
        codebuildRole: iam.Role,
        notificationsTopic: sns.Topic
    ): codebuild.IProject {
        const codebuildProjectName = changecase.pascal(`${projectName} build project`);
        let buildProject = new codebuild.PipelineProject(scope, codebuildProjectName, {
            projectName: codebuildProjectName,
            role: codebuildRole,
            buildSpec: codebuild.BuildSpec.fromSourceFilename(buildSpecLocation),
            environment: {
                buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
            },
        });
        const outputName1 = changecase.pascal(`${codebuildProjectName} name`);
        new core.CfnOutput(scope, outputName1, { value: buildProject.projectName });


        // add "build failed" notification
        const buildFailedEventRule = changecase.pascal(`${projectName} build failed event`);
        buildProject.onBuildFailed(buildFailedEventRule,
            {
                description: 'Notify Developers of Failed Builds',
                ruleName: buildFailedEventRule,
                target: new targets.SnsTopic(notificationsTopic)
            });
        const outputName2 = changecase.pascal(`${buildFailedEventRule} name`);
        new core.CfnOutput(scope, outputName2, { value: buildFailedEventRule });

        return buildProject;
    }

    private createDeployProject(
        scope: core.Construct,
        projectName: string,
        environment: string,
        buildSpecLocation: string,
        codebuildRole: iam.Role,
        notificationsTopic: sns.Topic
    ): codebuild.IProject {
        const codebuildProjectName = changecase.pascal(`${projectName} ${environment} deployment project`);
        let deployProject = new codebuild.PipelineProject(scope, codebuildProjectName, {
            projectName: codebuildProjectName,
            role: codebuildRole,
            buildSpec: codebuild.BuildSpec.fromSourceFilename(buildSpecLocation),
            environment: {
                buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
            },
        });
        const outputName1 = changecase.pascal(`${codebuildProjectName} name`);
        new core.CfnOutput(scope, outputName1, { value: deployProject.projectName });


        // add "deployment failed" notification
        const deployFailedEventRule = changecase.pascal(`${projectName} ${environment} deployment failed event`);
        deployProject.onBuildFailed(deployFailedEventRule,
            {
                description: 'Notify Developers of Failed Deployments',
                ruleName: deployFailedEventRule,
                target: new targets.SnsTopic(notificationsTopic)
            });

        const outputName2 = changecase.pascal(`${deployFailedEventRule} name`);
        new core.CfnOutput(scope, outputName2, { value: deployFailedEventRule });

        return deployProject;
    }

    private createUiTestProject(
        scope: core.Construct,
        projectName: string,
        environment: string,
        buildSpecLocation: string,
        codebuildRole: iam.Role,
        notificationsTopic: sns.Topic
    ): codebuild.IProject {
        const codebuildProjectName = changecase.pascal(`${projectName} ${environment} tests project`);
        let testProject = new codebuild.PipelineProject(scope, codebuildProjectName, {
            projectName: codebuildProjectName,
            role: codebuildRole,
            buildSpec: codebuild.BuildSpec.fromSourceFilename(buildSpecLocation),
            environment: {
                buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
            },
        });
        const outputName1 = changecase.pascal(`${codebuildProjectName} name`);
        new core.CfnOutput(scope, outputName1, { value: testProject.projectName });

        // add "tests failed" notification
        const testsFailedEventRule = changecase.pascal(`${projectName} ${environment} tests failed event`);
        testProject.onBuildFailed(testsFailedEventRule,
            {
                description: 'Notify Developers of Failed Tests',
                ruleName: testsFailedEventRule,
                target: new targets.SnsTopic(notificationsTopic)
            });
        const outputName2 = changecase.pascal(`${testsFailedEventRule} name`);
        new core.CfnOutput(scope, outputName2, { value: testsFailedEventRule });

        return testProject;
    }
}