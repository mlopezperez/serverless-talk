import { APIGatewayProxyHandler } from 'aws-lambda';
import { fetch } from 'node-fetch';
import { S3 } from 'aws-sdk'
import 'source-map-support/register';

interface IFetchImageRequest {
  imageUrl: string;
}

const s3 = new S3();

export const fetchAndUpload: APIGatewayProxyHandler = async (event, _context, callback) => {
  const input: IFetchImageRequest = JSON.parse(event.body);
  console.log('input:', input);

  fetch(input.imageUrl)
    .then((response) => {
      if (response.ok) {
        return response;
      }
      return Promise.reject(new Error(
        `Failed to fetch ${response.url}: ${response.status} ${response.statusText}`));
    })
    .then(response => response.buffer())
    .then(buffer => (      
      s3.putObject({
        Bucket: process.env.UPLOAD_BUCKET,
        Key: input.imageUrl,
        Body: buffer,
      }).promise()
    ))
    .then(v => callback(null, v), callback);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless Webpack (Typescript) v1.0! Your function executed successfully!',
      input: event
    }, null, 2),
  };
}
