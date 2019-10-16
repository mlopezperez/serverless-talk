import { S3Event, Context } from 'aws-lambda';
import { SNS } from 'aws-sdk';

interface IEventPayload {
    objectKey: string;
    objectSize: number;
    timestamp: string;
}

export const publishEventFromS3 = async (event: S3Event, context: Context) => {
    console.log('s3 event handled!', event);
    console.log('s3 event context', context);

    const sns = new SNS({ region: 'eu-west-1' });
    await event.Records.map(async r => {
        try {
            console.log('processing record', r);

            const payload: IEventPayload = {
                objectKey: r.s3.object.key,
                objectSize: r.s3.object.size,
                timestamp: r.eventTime
            };
            const message = JSON.stringify(payload);
            console.log('message', message);

            const inputRequest: SNS.PublishInput = {
                Message: message,
                TopicArn: process.env.UPLOAD_EVENT_TOPIC_ARN,
                MessageStructure: 'json'
            }
            console.log('request', JSON.stringify(inputRequest));

            let response = await sns.publish(inputRequest).promise();
            console.log('done!', response);
        } catch (e) {
            console.log('exception!', e);
        }
    });
}