# 브라우저 확장 프로그램 빌드 방법

## 전제 조건

빌드를 위해서는 Node.js 설치가 필요합니다. 아직 설치하지 않은 경우 다음 방법 중 하나를 사용하여 준비하세요:

- 로컬 PC에 Node.js 설치
  - [여기](https://nodejs.org/en/download)에서 "LTS"로 표시된 버전을 다운로드하여 설치합니다.
- AWS Cloud9 환경 사용
  - [이 지침](./DEPLOY_ON_AWS.md#creating-a-cloud9-environment)에 따라 Cloud9 환경을 생성합니다.

## 빌드

전제 조건이 준비되면 다음 단계에 따라 빌드합니다.

다음 단계는 `generative-ai-use-cases`의 루트 폴더에서 실행해야 합니다. `generative-ai-use-cases/browser-extension`에서 실행하면 안 됩니다.

### Unix 명령을 사용하는 사용자 (Cloud9, Linux, macOS 등)

다음 명령을 실행하여 CloudFormation Output에서 필요한 환경 변수를 동적으로 가져와 적절한 설정으로 빌드합니다.
이 명령들은 내부적으로 `aws`와 `jq` 명령을 사용하므로 설치되어 있지 않은 경우 설치하세요.

```bash
npm run extension:ci
npm run extension:buildw
```

빌드 결과물은 `browser-extension/dist/`에 저장됩니다.

### 기타 사용자 (Windows 등)

[CloudFormation](https://console.aws.amazon.com/cloudformation/home)에서 GenerativeAiUseCasesStack을 클릭하고 outputs 탭을 열어 구성에 필요한 값을 확인할 수 있습니다.

다음 방법 중 하나를 사용하여 이러한 값을 환경 변수로 설정해야 합니다:

#### 방법 1: 셸 변수 내보내기

다음 명령으로 값을 셸 변수로 설정하고 환경 변수로 내보내어 사용합니다. PowerShell을 사용하는 Windows 사용자는 명령이 다르므로 [이 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_environment_variables)를 참조하세요.

```bash
export VITE_APP_API_ENDPOINT=<API Endpoint>
export VITE_APP_REGION=<Deployed Region>
export VITE_APP_USER_POOL_ID=<Cognito User Pool ID>
export VITE_APP_USER_POOL_CLIENT_ID=<Cognito User Pool Client ID>
export VITE_APP_IDENTITY_POOL_ID=<Cognito Identity Pool ID>
export VITE_APP_PREDICT_STREAM_FUNCTION_ARN=<Function ARN>
```

구체적인 예시는 다음과 같습니다:

```bash
export VITE_APP_API_ENDPOINT=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/api/
export VITE_APP_REGION=ap-northeast-1
export VITE_APP_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
export VITE_APP_USER_POOL_CLIENT_ID=abcdefghijklmnopqrstuvwxyz
export VITE_APP_IDENTITY_POOL_ID=ap-northeast-1:xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxxxxxxx
export VITE_APP_PREDICT_STREAM_FUNCTION_ARN=arn:aws:lambda:ap-northeast-1:000000000000:function:FunctionName
```

#### 방법 2: `.env` 파일 사용

프론트엔드는 빌드에 Vite를 사용하며, 이는 `.env` 파일을 사용하여 환경 변수를 설정할 수 있습니다([참조](https://vitejs.dev/guide/env-and-mode#env-files) 참조). `/browser-extension/.env` 파일을 생성하고 위의 "셸 변수 내보내기" 방법과 동일한 항목을 설정합니다. `export` 키워드는 포함하지 않아야 합니다.

```bash
VITE_APP_API_ENDPOINT=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/api/
VITE_APP_REGION=ap-northeast-1
### 나머지 항목 생략 ###
```

#### 빌드 실행

환경 변수가 설정되면 다음 명령을 실행합니다:

```bash
npm run extension:ci
npm run extension:build
```

빌드 결과물은 `browser-extension/dist/`에 저장됩니다.

## 배포 방법

빌드 결과물 폴더 `browser-extension/dist/`를 zip 등으로 압축합니다.
선호하는 방법을 사용하여 압축 파일을 배포합니다.
