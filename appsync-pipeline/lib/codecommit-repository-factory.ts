import core = require('@aws-cdk/core');
import codecommit = require('@aws-cdk/aws-codecommit');
import sns = require('@aws-cdk/aws-sns');
import targets = require('@aws-cdk/aws-events-targets');
import { ProjectName } from './ProjectName';

export class CodeCommitRepositoryFactory {
    public create(
        scope: core.Construct,
        existingRepoName: string,
        projectName: ProjectName,
        pullRequestNotificationsTopic: sns.Topic
    ): codecommit.IRepository {
        const code = codecommit.Repository.fromRepositoryName(
            scope,
            'ImportedRepo',
            existingRepoName);
        new core.CfnOutput(scope, 'CodeRepositoryName', { value: code.repositoryName });

        // add notifications to repo
        const pullRequestStateChangeEventRule = projectName.toPascalCase + "PRStateChangeEventRule";
        code.onPullRequestStateChange(pullRequestStateChangeEventRule, {
            description: "Notifies Developers of PR state changes",
            ruleName: pullRequestStateChangeEventRule,
            target: new targets.SnsTopic(pullRequestNotificationsTopic)
        });
        new core.CfnOutput(scope, 'PRStateChangeEventRule', { value: pullRequestStateChangeEventRule });

        return code;
    }
}