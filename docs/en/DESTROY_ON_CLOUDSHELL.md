# Destroy Method Using AWS CloudShell (When It's Difficult to Prepare Your Own Environment)

## Overview

When deleting GenU, deletion is normally performed based on the deployed environment and configuration files. However, if you don't have these files due to one-click deployment or test deployments, you can quickly delete using this script.

## Launch CloudShell

Launch [CloudShell](https://console.aws.amazon.com/cloudshell/home).

If you have the `cdk.json` or `parameter.ts` used during deployment, select "Upload file" from the "Actions" dropdown list at the top right of the CloudShell terminal to upload the files.

## Download `destroy.sh` and Grant Execution Permission

Execute the following commands in CloudShell to download the `destroy.sh` script.
After downloading, grant execution permission to `destroy.sh`.

```bash
wget https://raw.githubusercontent.com/aws-samples/generative-ai-use-cases/refs/heads/main/destroy.sh -O destroy.sh
chmod +x destroy.sh
```

## Execute `destroy.sh`

`destroy.sh` supports the following options.

```bash
-c, --cdk-context    ... Path to the cdk.json file
-p, --parameter-file ... Path to the parameter.ts file
-e, --env           ... Environment name (e.g., dev, prod)
-y, --yes           ... Skip confirmation prompt
-h, --help          ... Show this message
```

If `cdk.json` or `parameter.ts` is not specified, parameters will be estimated from the deployed GenU-related stacks and `cdk.json` will be created. The parameter estimation method follows `setup-env.sh` and estimates through the following steps:

1. Search for deployed `GenerativeAiUseCasesStack*`
2. Retrieve configuration information from CloudFormation outputs
3. Automatically generate minimal cdk.json
4. Destroy all related stacks

### Destroy Examples

Execute destroy.sh with the following commands.

#### 1. Auto-detect and Destroy

Automatically restores configuration from the deployed stack and destroys it. Use this method if you don't have configuration files.

```bash
./destroy.sh
```

If you have separate environments, set `--env`:

```bash
./destroy.sh --env dev
```

A confirmation prompt will be displayed. Enter `yes` to execute the destruction. If you want to skip confirmation and execute, run as follows:

```bash
./destroy.sh --env dev --yes
```

#### 2. Destroy Using Customized cdk.json

If you have the cdk.json used during deployment:

```bash
./destroy.sh --cdk-context ~/cdk.json
```

#### 3. Destroy Using Customized parameter.ts

If you have the parameter.ts used during deployment:

```bash
./destroy.sh --parameter-file ~/parameter.ts
```

#### 4. Destroy with parameter.ts and Environment Specification

```bash
./destroy.sh --parameter-file ~/parameter.ts --env prod
```

### Important Notes

- Destroy operations cannot be undone
- A confirmation prompt is always displayed before destruction (unless using the `--yes` option)
- All related resources (S3 buckets, DynamoDB tables, Lambda functions, etc.) will be deleted
- If you need data backups, please obtain them before destruction
