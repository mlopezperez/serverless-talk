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
  region: ${opt:region, env:AWS_DEFAULT_REGION, 'eu-west-1'}
  stage: dev
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

- We create the source code (see: `src/fetchAndUpload/handler`);
- We add the new function to `serverless.yml`

```yml
fetchAndUpload:
    handler: src/fetchAndUpload/handler.fetchAndUpload
    events:
      - http:
          method: get
          path: fetch
```

- Example request:

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
