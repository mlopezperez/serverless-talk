import { S3Event, Context } from 'aws-lambda';

export const publishEventFromS3 = (event: S3Event, context: Context) => { 
    console.log('s3 event handled!', event);
    console.log('s3 event context', context);
}