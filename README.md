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
