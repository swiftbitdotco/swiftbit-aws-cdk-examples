import changecase = require('change-case');

import core = require('@aws-cdk/core');
import codecommit = require('@aws-cdk/aws-codecommit');
import sns = require('@aws-cdk/aws-sns');
import targets = require('@aws-cdk/aws-events-targets');

export class CodeCommitRepositoryFactory {
    public create(
        scope: core.Construct,
        existingRepoName: string,
        projectName: string,
        pullRequestNotificationsTopic: sns.Topic
    ): codecommit.IRepository {
        const repoName = changecase.pascal(`${projectName} code repository`);
        const code = codecommit.Repository.fromRepositoryName(
            scope,
            repoName,
            existingRepoName
        );

        const outputName1 = changecase.pascal(`${repoName} name`)
        new core.CfnOutput(scope, outputName1, { value: code.repositoryName });

        // add notifications to repo
        const ruleName = changecase.pascal(`${projectName} PR state change event rule`);
        code.onPullRequestStateChange(ruleName, {
            description: "Notifies Developers of PR state changes",
            ruleName: ruleName,
            target: new targets.SnsTopic(pullRequestNotificationsTopic)
        });
        const outputName2 = changecase.pascal(`${ruleName} name`);
        new core.CfnOutput(scope, outputName2, { value: ruleName });

        return code;
    }
}