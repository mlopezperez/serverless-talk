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
  "imgUrl": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6220/6220794_sa.jpg"
}
```
