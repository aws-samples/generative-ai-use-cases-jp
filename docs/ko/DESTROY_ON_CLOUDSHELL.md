# AWS CloudShell을 이용한 삭제 방법 (로컬 환경을 준비하기 어려운 경우)

## 개요

GenU를 삭제할 때는 일반적으로 배포한 환경과 그곳에 있는 설정 파일을 기반으로 삭제를 수행합니다. 하지만 원클릭이나 검증용 배포 등으로 인해 이러한 파일이 없는 경우, 본 스크립트로 빠르게 삭제를 수행할 수 있습니다.

## CloudShell 시작

[CloudShell](https://console.aws.amazon.com/cloudshell/home)을 시작합니다.

배포 시 사용한 `cdk.json` 또는 `parameter.ts`가 있는 경우, CloudShell 터미널 오른쪽 상단의 "Actions" 드롭다운 목록에서 "Upload file"을 선택하여 파일을 업로드하세요.

## `destroy.sh` 다운로드 및 실행 권한 부여

CloudShell에서 다음 명령을 실행하여 `destroy.sh` 스크립트를 다운로드합니다.
다운로드 후 `destroy.sh`에 실행 권한을 부여합니다.

```bash
wget https://raw.githubusercontent.com/aws-samples/generative-ai-use-cases/refs/heads/main/destroy.sh -O destroy.sh
chmod +x destroy.sh
```

## `destroy.sh` 실행

`destroy.sh`는 다음 옵션을 지원합니다.

```bash
-c, --cdk-context    ... Path to the cdk.json file
-p, --parameter-file ... Path to the parameter.ts file
-e, --env           ... Environment name (e.g., dev, prod)
-y, --yes           ... Skip confirmation prompt
-h, --help          ... Show this message
```

`cdk.json` 또는 `parameter.ts`가 지정되지 않은 경우, 배포된 GenU 관련 스택에서 매개변수를 추정하여 `cdk.json`을 생성합니다. 매개변수 추정 방법은 `setup-env.sh`를 따르며 다음 단계로 추정합니다:

1. 배포된 `GenerativeAiUseCasesStack*` 검색
2. CloudFormation 출력에서 설정 정보 가져오기
3. 필요 최소한의 cdk.json 자동 생성
4. 모든 관련 스택 삭제

### 삭제 예제

다음 명령으로 destroy.sh를 실행합니다.

#### 1. 자동 감지로 삭제

배포된 스택에서 자동으로 설정을 복원하여 삭제합니다. 설정 파일이 없는 경우 이 방법을 사용하세요.

```bash
./destroy.sh
```

환경을 분리한 경우 `--env`를 설정하세요:

```bash
./destroy.sh --env dev
```

확인 프롬프트가 표시되므로 `yes`를 입력하여 삭제를 실행합니다. 확인을 건너뛰고 실행하려면 다음과 같이 실행하세요:

```bash
./destroy.sh --env dev --yes
```

#### 2. 사용자 정의 cdk.json을 사용하여 삭제

배포 시 사용한 cdk.json이 있는 경우:

```bash
./destroy.sh --cdk-context ~/cdk.json
```

#### 3. 사용자 정의 parameter.ts를 사용하여 삭제

배포 시 사용한 parameter.ts가 있는 경우:

```bash
./destroy.sh --parameter-file ~/parameter.ts
```

#### 4. parameter.ts와 환경을 지정하여 삭제

```bash
./destroy.sh --parameter-file ~/parameter.ts --env prod
```

### 주의사항

- 삭제 작업은 취소할 수 없습니다
- 삭제 전에 항상 확인 프롬프트가 표시됩니다 (`--yes` 옵션을 사용하지 않는 한)
- 모든 관련 리소스(S3 버킷, DynamoDB 테이블, Lambda 함수 등)가 삭제됩니다
- 데이터 백업이 필요한 경우 삭제 전에 백업하세요
