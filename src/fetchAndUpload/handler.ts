import { APIGatewayProxyHandler } from 'aws-lambda';
import fetch from 'node-fetch';
import { S3 } from 'aws-sdk'
import { v4 as uuid } from 'uuid';
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
          Key: `${uuid()}.jpg`,
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
