import sdk = require('aws-sdk');

export class S3Helper{
    // https://stackoverflow.com/a/50842851
    public checkBucketExists = async (bucket: any) => {
        const s3 = new sdk.S3();
        const options = {
            Bucket: bucket,
        };
        try {
            await s3.headBucket(options).promise();
            return true;
        } catch (error) {
            if (error.statusCode === 404) {
                return false;
            }
            throw error;
        }
    };
}