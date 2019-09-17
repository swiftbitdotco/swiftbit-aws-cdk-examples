import changecase = require('change-case');

import core = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');


export class WebsiteBucketFactory {
    public static createIfNotExists(
        scope: core.Construct,
        websiteBucketName: string,
        environment: string
    ) {
        const envNamePascalCase = changecase.pascal(environment);

        // Website/Content bucket
        let bucketExists = true; //S3Helper.checkBucketExists(websiteBucketName);
        if (!bucketExists) {
            const siteBucket = new s3.Bucket(scope, envNamePascalCase + 'SiteBucket', {
                bucketName: websiteBucketName,
                websiteIndexDocument: 'index.html',
                websiteErrorDocument: 'index.html',
                publicReadAccess: true,
            });
            siteBucket.grantPublicAccess();

            new core.CfnOutput(scope, envNamePascalCase + 'SiteBucketName', { value: siteBucket.bucketName });
        } else {
            // bucket policy in case public permissions get wiped (!):
            // REMEMBER TO REPLACE <bucketname>
            /*
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "PublicReadGetObject",
                        "Effect": "Allow",
                        "Principal": "*",
                        "Action": "s3:GetObject",
                        "Resource": "arn:aws:s3:::<bucketname>/*"
                    }
                ]
            }
            */
        }
    }
}