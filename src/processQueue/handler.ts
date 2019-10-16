import { SQSEvent, Context } from 'aws-lambda'

export const processQueue = async (event: SQSEvent, context: Context) => {
    console.log('event', event);
    console.log('context', context);
    // Here we can, for example, store info in a DynamoDB table
}