# How to Update

GenU is frequently updated. In addition to new features and improvements, there may be security-related updates, so we recommend regularly pulling the main branch from the repository and redeploying.

If you are using the [deployment method with AWS CloudShell](/docs/DEPLOY_ON_CLOUDSHELL.md), you will always deploy the latest main branch, so you can update by simply running `deploy.sh` again (the following steps are not necessary).

## Pull the main branch

We assume that you have already cloned the repository and completed the initial deployment.
To pull the contents of the main branch, run the following command:

```bash
git pull
```

If you have customized another repository, the remote may be registered under a different name.
You can check the remote with the following command:

```bash
git remote -v
```

In the following example output, the repository managed by the aws-samples Organization (the main repository) is registered under the name aws.

```
origin  https://my-private-git-hosting-site.com/myawesomeorg/generative-ai-use-cases (fetch)
origin  https://my-private-git-hosting-site.com/myawesomeorg/generative-ai-use-cases (push)
aws     https://github.com/aws-samples/generative-ai-use-cases (fetch)
aws     https://github.com/aws-samples/generative-ai-use-cases (push)
```

In this case, explicitly specify aws to perform the pull:

```bash
git pull aws
```

If the result of `git remote -v` does not show a repository managed by aws-samples, add it with the following command:

```bash
git remote add aws https://github.com/aws-samples/generative-ai-use-cases
```

Since it is registered under the name aws, run `git pull aws` to perform the pull.

## If you want to check the changes before merging

The `git pull` command performs `git fetch` (retrieve changes) and `git merge` (merge changes) simultaneously.
If you want to check the changes before merging, run `fetch` and `merge` separately.
In the following commands, we assume that [aws-samples/generative-ai-use-cases](https://github.com/aws-samples/generative-ai-use-cases) is registered as a remote under the name origin.
To check the remote name, run the `git remote -v` command mentioned earlier.

First, retrieve the changes with the following command:

```bash
git fetch origin
```

Then, check the differences between your local code and origin/main:

```bash
git diff origin/main
```

If there are no issues, perform the merge:

```bash
git merge origin/main
```

## If conflicts occur

If conflicts occur during `git pull`, your customized code and the changes from the main repository have been made to the same file simultaneously.
You will need to manually fix the code with conflicts.

Pay special attention to conflicts in [cdk.json](/packages/cdk/cdk.json).
**After `git pull`, make sure to check that the settings you made locally have not been removed.**

## Redeploy

Basically, follow the steps in [README.md](/README.md), but bootstrapping is not necessary.
Since the packages may have been updated, run the `npm ci` command.

```bash
npm ci
npm run cdk:deploy
```
