# Deploying on AWS CloudShell (When it's difficult to set up your local environment)

## Editing cdk.json

With GenU, you can customize the deployment options by modifying the context section in cdk.json.
For available deployment options, please refer to [Deployment Options](/docs/DEPLOY_OPTION.md).
If you don't need to specify any deployment options, you can skip this step and use the [default cdk.json](/packages/cdk/cdk.json).

If you want to specify deployment options, download the [default cdk.json](/packages/cdk/cdk.json) (you can download the file by clicking the download button at the top right of the GitHub page), modify the context section, and save the file.

## Launching CloudShell

Launch [CloudShell](https://console.aws.amazon.com/cloudshell/home).
If you customized cdk.json in the previous step, upload the customized cdk.json file by clicking Upload file in the Actions menu at the top right.

## Downloading deploy.sh and Granting Execution Permission

In CloudShell, run the following command to download a script named `deploy.sh`.
After downloading, it grants execution permission to deploy.sh.

```bash
wget https://raw.githubusercontent.com/aws-samples/generative-ai-use-cases-jp/refs/heads/main/deploy.sh -O deploy.sh
chmod +x deploy.sh
```

## Running deploy.sh

Run `deploy.sh` with the following command.
Note that the `--cdk-context` option specifies the path to the customized cdk.json (this is the path if you simply uploaded the file in the previous step).
If your cdk.json is located in a different path, modify the argument value accordingly.

```bash
./deploy.sh --cdk-context ~/cdk.json
```

If you don't need to customize cdk.json, you don't need to specify `--cdk-context`.
In that case, the deployment will use the settings in the [default cdk.json](/packages/cdk/cdk.json).

```bash
./deploy.sh
```

During the deployment, a confirmation prompt will be displayed. Enter `y` and press Enter to proceed.
Upon completion, the CloudFront URL will be displayed. You can access GenU by opening that URL in your browser.

Note that even when running these steps, you need to enable the models you want to use from the [Amazon Bedrock Model access](https://console.aws.amazon.com/bedrock/home#/modelaccess).
If you're using the default cdk.json, make sure that the models specified in modelIds and imageGenerationModelIds under modelRegion in the [default cdk.json](/packages/cdk/cdk.json) are enabled.
