## 로컬 환경 구축 절차

개발자를 위한 로컬 환경 구축 절차에 대해 설명합니다. 로컬 환경을 구축하는 경우에도 앞서 설명한 AWS에 배포가 되어 있어야 합니다.


### Unix 계열 명령어를 사용하는 사용자 (Linux, MacOS 등)

다음 명령어를 실행하여 CloudFormation 의 Output 에서 필요한 환경 변수를 동적으로 가져와 서버를 실행합니다.

```bash
npm run web:devw
```

### 기타 사용자 (Windows 등)

배포 완료시 표시되는 Outputs 에서 API 의 Endpoint (Output key = APIApiEndpoint...)、Cognito User Pool ID (Output key = AuthUserPoolId...)、Cognito User Pool Client ID (Output Key = AuthUserPoolClientId...) 、Cognito Identity Pool ID (Output Key = AuthIdPoolId...)、리스폰스 스트리밍 Lambda 함수의 ARN (Output Key = APIPredictStreamFunctionArn...) 을 가져옵니다.
배포 시 콘솔에서의 출력이 사라졌다면、[CloudFormation](https://console.aws.amazon.com/cloudformation/home) 의 GenerativeAiUseCasesStack 을 클릭하여 Outputs 탭에서 확인 할 수 있습니다.
해당 값을 아래와 같이 환경 변수로 설정합니다.

```bash
export VITE_APP_API_ENDPOINT=<API Endpoint>
export VITE_APP_USER_POOL_ID=<Cognito User Pool ID>
export VITE_APP_USER_POOL_CLIENT_ID=<Cognito User Pool Client ID>
export VITE_APP_IDENTITY_POOL_ID=<Cognito Identity Pool ID>
export VITE_APP_PREDICT_STREAM_FUNCTION_ARN=<Function ARN>
export VITE_APP_REGION=<배포 리전>
```

구체적인 예는 아래와 같습니다.

```bash
export VITE_APP_API_ENDPOINT=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/api/
export VITE_APP_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
export VITE_APP_USER_POOL_CLIENT_ID=abcdefghijklmnopqrstuvwxyz
export VITE_APP_IDENTITY_POOL_ID=ap-northeast-1:xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxxxxxxx
export VITE_APP_PREDICT_STREAM_FUNCTION_ARN=arn:aws:lambda:ap-northeast-1:000000000000:function:FunctionName
export VITE_APP_REGION=ap-northeast-1
```

이어서 다음 명령어를 실행합니다.

```bash
npm run web:dev
```

정상적으로 실행된다면 http://localhost:5173 에서 실행됩니다. 브라우저로 확인 할 수 있습니다.

## Pull Request 를 제출하는 경우

버그 수정이나 기능 개선등의 Pull Request 는 환영합니다. 커밋하기 전에 lint 툴을 실행해 주시기 바랍니다.

```bash
npm run lint
```
