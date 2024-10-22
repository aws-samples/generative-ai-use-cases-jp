# How to Delete Resources

Run the following command. **All data, including Cognito User Pool, DynamoDB Table, will be deleted.**

```bash
npm run cdk:destroy
```

## If an Error Occurs

You may encounter the following error:

> **The bucket you tried to delete is not empty. You must delete all versions in the bucket.**

When deleting an S3 bucket, you need to empty its contents. Although you can specify the `autoDeleteObjects: true` option in AWS CDK to automatically empty the contents before deletion, the above error may occur if new files are added between the time the contents are emptied and the actual deletion.

If this error occurs, follow these steps to manually delete the stack:

1. Open [AWS CloudFormation](https://console.aws.amazon.com/cloudformation/home) and select the GenerativeAiUseCasesStack.
2. Click Delete. You will be asked whether to skip the deletion of the S3 bucket that failed to delete. Check the box and proceed with the deletion.
3. The deletion of resources other than the skipped S3 bucket will be completed.
4. Open [Amazon S3](https://s3.console.aws.amazon.com/s3/home) and find the skipped S3 bucket (search for "generative" or similar).
5. Execute Empty (to empty the bucket) => Delete (to delete the bucket).
