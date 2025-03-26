# Deployment Method Using AWS CloudShell (For Cases Where Setting Up a Local Environment is Difficult)

## Editing cdk.json

In GenU, you can specify deployment options by customizing the context section in cdk.json.
For available deployment options, please refer to [Deployment Options](./DEPLOY_OPTION.md).
If you're fine with using the [default cdk.json](/packages/cdk/cdk.json) for now, you can skip this step.

If you want to specify deployment options, download the [default cdk.json](/packages/cdk/cdk.json) (you can download the file from the download button at the top right of the GitHub page), modify the context section, and save the file.

## Launching CloudShell

Launch [CloudShell](https://console.aws.amazon.com/cloudshell/home).
If you customized cdk.json in the previous step, upload your customized cdk.json file using the Upload file option from the Actions menu in the top right.

## Downloading deploy.sh and Granting Execution Permissions

Run the following commands in CloudShell to download a script called `deploy.sh`.
After downloading, we'll grant execution permissions to deploy.sh.

```bash
wget https://raw.githubusercontent.com/aws-samples/generative-ai-use-cases-jp/refs/heads/main/deploy.sh -O deploy.sh
chmod +x deploy.sh
```

## Running deploy.sh

Run `deploy.sh` with the following command.
Note that the `--cdk-context` option specifies the path to your customized cdk.json. (This will be the path if you uploaded files following the steps above without making any changes.)
If your cdk.json is in a different location, please adjust the argument value accordingly.

```bash
./deploy.sh --cdk-context ~/cdk.json
```

If you don't need to customize cdk.json, the `--cdk-context` specification is not required.
In that case, the deployment will use the settings from the [default cdk.json](/packages/cdk/cdk.json).

```bash
./deploy.sh
```

During deployment, you'll be prompted for confirmation, so enter `y` and press Enter to proceed.
When deployment is complete, a CloudFront URL will be displayed. You can access GenU by opening that URL in your browser.

Note that even when following these steps, you need to enable the models you want to use from [Amazon Bedrock's Model access](https://console.aws.amazon.com/bedrock/home#/modelaccess).
If you're using the default cdk.json, please check that the models specified in modelIds and imageGenerationModelIds in the modelRegion of the [default cdk.json](/packages/cdk/cdk.json) are enabled.
