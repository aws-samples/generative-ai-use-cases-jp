# 업데이트 방법

GenU는 자주 업데이트됩니다.
기능 추가 및 개선 외에도 보안 관련 업데이트가 포함될 수 있으므로 정기적으로 저장소의 main 브랜치에서 pull하고 재배포하는 것을 권장합니다.

[AWS CloudShell을 사용한 배포 방법](./DEPLOY_ON_CLOUDSHELL.md)을 사용하는 경우, 항상 최신 main 브랜치를 배포하므로 `deploy.sh`를 다시 실행하기만 하면 업데이트할 수 있습니다. (다음 단계는 필요하지 않습니다.)

## 수동 업데이트 과정

사용자가 직접 업데이트하는 방법입니다.

### main 브랜치 pull

이미 저장소를 복제하고 초기 배포를 완료했다고 가정합니다.
main 브랜치의 내용을 pull하려면 다음 명령을 실행합니다:

```bash
git pull
```

다른 저장소에서 사용자 정의하는 경우 원격이 다른 이름으로 등록되어 있을 수 있습니다.
다음 명령으로 원격을 확인할 수 있습니다:

```bash
git remote -v
```

아래 예제 출력에서 aws-samples Organization에서 관리하는 저장소(원본 저장소)가 "aws"라는 이름으로 등록되어 있습니다.

```
origin  https://my-private-git-hosting-site.com/myawesomeorg/generative-ai-use-cases (fetch)
origin  https://my-private-git-hosting-site.com/myawesomeorg/generative-ai-use-cases (push)
aws     https://github.com/aws-samples/generative-ai-use-cases (fetch)
aws     https://github.com/aws-samples/generative-ai-use-cases (push)
```

이 경우 pull할 때 "aws"를 명시적으로 지정합니다:

```bash
git pull aws
```

`git remote -v` 결과에 aws-samples에서 관리하는 저장소가 표시되지 않으면 다음 명령으로 추가합니다:

```bash
git remote add aws https://github.com/aws-samples/generative-ai-use-cases
```

이제 "aws"라는 이름으로 등록되었으므로 `git pull aws`를 실행하여 pull을 수행합니다.

### 변경사항을 통합하기 전에 확인하고 싶은 경우

`git pull` 명령은 `git fetch`(변경사항 가져오기)와 `git merge`(변경사항 통합)를 동시에 수행합니다.
변경사항을 통합하기 전에 확인하려면 `fetch`와 `merge`를 별도로 실행합니다.
다음 명령에서는 [aws-samples/generative-ai-use-cases](https://github.com/aws-samples/generative-ai-use-cases)가 원격에서 "origin"으로 등록되어 있다고 가정합니다.
원격 이름을 확인하려면 앞서 언급한 `git remote -v` 명령을 실행하세요.

먼저 다음 명령으로 변경사항을 가져옵니다:

```bash
git fetch origin
```

다음으로 로컬 코드와 origin/main 간의 차이점을 확인합니다:

```bash
git diff origin/main
```

문제가 없으면 병합을 실행합니다:

```bash
git merge origin/main
```

### 충돌이 발생하는 경우

`git pull` 중에 충돌이 발생하면 사용자 정의 코드와 원본 변경사항이 동시에 같은 파일을 수정했다는 의미입니다.
충돌이 있는 코드는 수동으로 수정해야 합니다.

[cdk.json](/packages/cdk/cdk.json)의 충돌에 특히 주의하세요.
**`git pull` 후에는 항상 확인하여 로컬에서 구성한 항목이 손실되지 않았는지 확인하세요.**

### 재배포

기본적으로 [README.md](/README.md)의 단계를 따르지만 Bootstrap은 필요하지 않습니다.
패키지가 업데이트되었을 수 있으므로 `npm ci` 명령을 실행하세요:

```bash
npm ci
npm run cdk:deploy
```

## 업데이트 자동화

AWS에서 업데이트를 자동화하는 방법도 있습니다.
다음 기사에서는 AWS CodePipeline과 통합하여 GitHub에서 두 번의 클릭만으로 업데이트하는 방법을 소개합니다:  
[GenU를 번개처럼 빠르게 업데이트! AWS CodePipeline을 사용한 원클릭 업데이트 기법](https://qiita.com/moritalous/items/9ade46091a60030415e0) by [@moritalous](https://x.com/moritalous)
