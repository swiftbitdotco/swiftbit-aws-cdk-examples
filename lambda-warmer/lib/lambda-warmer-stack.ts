import core = require('@aws-cdk/core');
import events = require('@aws-cdk/aws-events');
import targets = require('@aws-cdk/aws-events-targets');
import lambda = require('@aws-cdk/aws-lambda');

export class LambdaWarmerStack extends core.Stack {
    constructor(
        scope: core.App,
        id: string,
        lambdaArn: string,
        props: core.StackProps
    ) {
        super(scope, id, props);

        const rule = new events.Rule(this, 'LambdaWarmerRule', {
            // Run every 5 minutes Monday through Friday between 8:00 am and 5:55 pm (UTC) 
            schedule: events.Schedule.expression('cron(0/5 8-17 ? * MON-FRI *)'),
            description: 'Lambda warmer; Runs every 5 mins, Mon-Fri between 8:00-17:55',
            ruleName: 'LambdaWarmerRule',

        });

        let existingLambda = lambda.Function.fromFunctionArn(this, 'PalindromeLambda', lambdaArn);
        rule.addTarget(new targets.LambdaFunction(existingLambda,
            {
                event: events.RuleTargetInput.fromText('{ "string": "value1" }')
            }));
    }
}