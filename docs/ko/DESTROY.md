# 리소스 삭제 방법

배포 방법에 따라 다음 명령을 실행하세요. **Cognito UserPool, DynamoDB Table 등을 포함한 모든 데이터가 삭제됩니다.**

```bash
# cdk.json의 context.env에 지정된 환경 삭제
npm run cdk:destroy

# parameter.ts에 구성된 환경 삭제 (다음 예제에서는 'prod')
npm run cdk:destroy -- -c env=prod
```

> [!NOTE]
> 배포 시점과 삭제 시점에 cdk.json(parameter.ts)의 값이 다르면 위 명령을 실행할 때 특정 스택이 삭제되지 않을 수 있습니다.
> AWS Management Console의 CloudFormation 페이지(modelRegion과 cdk deploy를 실행한 지역)에서 스택이 남아있지 않은지 확인하세요.

## 오류가 발생하는 경우

다음과 같은 오류가 발생할 수 있습니다:

> **삭제하려는 버킷이 비어있지 않습니다. 버킷의 모든 버전을 삭제해야 합니다.**

S3 버킷은 삭제하기 전에 비워야 합니다. AWS CDK는 삭제 전에 버킷을 자동으로 비우는 `autoDeleteObjects: true` 옵션을 제공하지만, 버킷을 비우는 것과 실제 삭제 사이에 새 파일이 추가되면 이 오류가 발생할 수 있습니다.

이 오류가 발생하면 다음 단계에 따라 스택을 수동으로 삭제하세요:

1. [AWS CloudFormation](https://console.aws.amazon.com/cloudformation/home)을 열고 GenerativeAiUseCasesStack을 선택합니다.
2. Delete를 클릭합니다. 삭제에 실패한 S3 버킷의 삭제를 건너뛸지 묻는 메시지가 표시됩니다. 체크박스를 선택하고 삭제를 진행합니다.
3. 건너뛴 S3 버킷을 제외한 모든 리소스의 삭제가 완료됩니다.
4. [Amazon S3](https://s3.console.aws.amazon.com/s3/home)을 열고 건너뛴 S3 버킷을 찾습니다. ("generative" 등으로 검색)
5. Empty(버킷 비우기) => Delete(버킷 삭제)를 실행합니다
