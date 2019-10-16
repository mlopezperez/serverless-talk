# Serverless Framework

## Init a serverless project

- Create a folder for your project.
- `git init` if you want to keep a repo!
- `serverless create --template aws-nodejs-typescript`
- Voilá! You have the basic scaffolding!
- Now you can try with `aws-csharp` as `template`

## Let's add some basic configuration

- Notice the `serverless yml` file.
- Notice the `webpack-plugin` configuration inside. We're using webpack! (Less things to learn!)
- Let's add the `region` and the `stage` parameters under the `provider` section.

```yml
  region: ${opt:region, 'eu-west-1'}
  stage: dev
  memorySize: 512
```

### Variables

- `${}` syntax:
  - `${opt:name}` for options from command line
  - `${self:section:name}` to reference the same file
  - `${env:varName}` for environment variables.
- Variables from other files can be referenced

## Now... let's deploy

- Run `serverless deploy`
- Go to your AWS console!

## Adding a bucket and a new function

- We create the source code of the handler

```typescript
import { APIGatewayProxyHandler } from 'aws-lambda';
import fetch from 'node-fetch';
import { S3 } from 'aws-sdk'
import 'source-map-support/register';

interface IFetchImageRequest {
  imageUrl: string;
}

export const fetchAndUpload: APIGatewayProxyHandler = async (event, context) => {
  console.log('event', event);
  console.log('context', context);
  const input: IFetchImageRequest = JSON.parse(event.body);
  console.log('input:', input);
  console.log('url:', input.imageUrl);

  const s3 = new S3();

  await fetch(input.imageUrl)
    .then(
      response => {
        console.log('fetch success, response', response);
        return response;
      }).then(
        response => {
          console.log('buffering response');
          return response.buffer();
        }
      ).then(async buffer => {
        const uploadParms = {
          Bucket: process.env.UPLOAD_BUCKET,
          Key: input.imageUrl,
          Body: buffer,
        };
        console.log('uploadParms', uploadParms);
        await s3.putObject(uploadParms).promise();
        console.log('object put in bucket');
      });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless Webpack (Typescript) v1.0! Your function executed successfully!',
      input: event
    }, null, 2),
  };
}

```

- We add the new function to `serverless.yml`

```yml
fetchAndUpload:
    handler: src/fetchAndUpload/handler.fetchAndUpload
    events:
      - http:
          method: post
          path: fetch
```

- Example request body:

```json
{
  "imageUrl": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6220/6220794_sa.jpg"
}
```

## Configure the S3 bucket

- Custom section for the name

```yml
custom:
  bucketName: ${self:provider.stage}-upload-images
```

- Configure the environment variable so it can be read from code

```yml
  environment:
    UPLOAD_BUCKET: ${self:custom.bucketName}
```

- Add the bucket resource

```yml
resources:
  Resources:
    S3BucketImagesUpload:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: ${self:custom.bucketName}yml
```

- Add the IAM policy in provider section

```yml
  iamRoleStatements:
    - Effect: "Allow"
      Action:
        - s3:*
      Resource:
        - 'arn:aws:s3:::${self:custom.bucketName}/*'
```

## Subscribing a lambda to S3 event

- Create lambda code, with `S3Event`
- Configure function with `s3` event referencing the bucket

```yml
  publishEvent:
    handler: src/publishEvent/handler.publishEventFromS3
    events:
      - s3:
          bucket: ImagesUpload
          event: s3:ObjectCreated:*
```

- Add the permission for the bucket to invoke the lambda. This is done in the resources. This is not in the `iamStatements` because is the bucket invoking the lambda, and not the lambda using the bucket

```yml
PublishEventLambdaPermissionImagesUploadS3:
      Type: 'AWS::Lambda::Permission'
      Properties:
        FunctionName:
          'Fn::GetAtt':
            - PublishEventLambdaFunction
            - Arn
        Principal: 's3.amazonaws.com'
        Action: 'lambda:InvokeFunction'
        SourceAccount:
          Ref: AWS::AccountId
        SourceArn: 'arn:aws:s3:::${self:custom.bucketName}'
```

## Publish to SNS topic

- Modify the code of the lambda

```typescript  
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
    await Promise.all(event.Records.map(async r => {
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
                TopicArn: process.env.UPLOAD_EVENT_TOPIC_ARN
            }
            console.log('request', JSON.stringify(inputRequest));

            let response = await sns.publish(inputRequest).promise();
            console.log('done!', response);
        } catch (e) {
            console.log('exception!', e);
        }
    }));
}
```

- Configure topic name in custom section

```yml
topicName: ${self:provider.stage}--upload-publish
```

- Configure env variable with topic ARN using pseudo-parameters plugin

```yml
topicArn: 'arn:aws:sns:#{AWS::Region}:#{AWS::AccountId}:${self:custom.topicName}'
```

- Configure topic resource

```yml
UploadEventTopic:
      Type: AWS::SNS::Topic
      Properties:
        TopicName: ${self:custom.topicName}
```

- Configure `iamStatement` so lambdas can publish in SNS (and create the topic first)

```yml
 - Effect: "Allow"
      Action:
        - sns:Publish
        - sns:CreateTopic
      Resource:
        - 'Fn::Join':
          - ':'
          - - 'arn:aws:sns'
            - Ref: 'AWS::Region'
            - Ref: 'AWS::AccountId'
            - ${self:custom.topicName}
```

## Subscribe SQS to SNS and trigger lambda

- Define queue and deadletter queue

```yml UploadEventDeadLetterQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: ${self:custom.queueName}-DeadLetters
        MessageRetentionPeriod: 1209600 # 14 days in seconds
```

- Define policy for SNS to publish to SQS

```yml
UploadEventQueuePolicy:
      Type: AWS::SQS::QueuePolicy
      Properties:
        Queues:
          - Ref: UploadEventQueue
        PolicyDocument:
          Version: "2012-10-17"
          Statement:
            - Effect: Allow
              Principal: "*"
              Action:
                - sqs:SendMessage
              Resource: "*"
              Condition:
                ArnEquals:
                  aws:SourceArn: ${self:custom.topicArn}
```

- Define subscription

```yml
 UploadEventSubscription:
      Type: AWS::SNS::Subscription
      Properties:
        TopicArn: ${self:custom.topicArn}
        Endpoint:
          Fn::GetAtt:
            - UploadEventQueue
            - Arn
        RawMessageDelivery: true
        Protocol: sqs
```

- Define lambda handler code. In this case we'll just read the event

```typescript
import { SQSEvent, Context } from 'aws-lambda'

export const processQueue = async (event: SQSEvent, context: Context) => {
    console.log('event', event);
    console.log('context', context);
    // Here we can, for example, store info in a DynamoDB table
}
```

- Define function in `serverless.yml` linked to SQS event

```yml
    processQueue:
    handler: src/processQueue/handler.processQueue
    events:
      - sqs:
          batchSize: 1
          arn:
            Fn::GetAtt:
              - UploadEventQueue
              - Arn
```
