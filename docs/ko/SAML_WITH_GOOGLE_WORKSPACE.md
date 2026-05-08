# Google Workspace와 SAML 통합

이 가이드는 Google Workspace와 SAML을 통합하는 참조 절차를 소개합니다. 세부 매개변수는 환경에 맞게 수정하세요.

# 사전 작업

먼저 GenU를 배포합니다. 초기 배포 후 Cognito와 Google Workspace 간의 SAML 통합을 설정합니다.

CloudFormation Stack 화면의 Outputs 탭을 열고 WebUrl을 기록해 둡니다.

![image-20240205185011526](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240205185011526.png)

다음으로 Resource 탭에서 Cognito 사용자 풀의 Physical ID를 기록해 둡니다.

![image-20240128114108630](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317105731051.png)

# Cognito 구성: 도메인 설정

Cognito 도메인 구성을 진행합니다.
Cognito 사용자 풀 화면에서 App integration 탭을 열고 Domain 화면을 표시합니다. Cognito Domain이 비어 있으므로 Actions에서 Create Cognito domain을 선택합니다.

![image-20240128115029927](../assets/SAML_WITH_ENTRA_ID/image-20240128115029927.png)

적절한 이름을 지정하고 Create Cognito domain을 누릅니다. 이 절차에서는 `your-preferred-name-google`을 사용합니다. 전역적으로 고유한 이름을 제공해야 합니다.

![image-20240128115448597](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316234530866.png)

Cognito 도메인이 구성되었습니다.

![image-20240128115539920](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316234607065-1710645672447-1710645678992.png)

# Google Workspace 구성: SAML 애플리케이션

아래 URL에서 Google Workspace 관리 콘솔을 열고 SAML 구성을 진행합니다.
https://admin.google.com/u/0/ac/home

애플리케이션 설정 화면에서 Add Custom SAML App을 클릭합니다.

![image-20240316233910260](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316233910260.png)

Google Workspace의 관리용 이름을 입력합니다. 임의의 이름으로 괜찮습니다. 여기서는 `generative-ai-use-cases`를 사용합니다.

![image-20240316234731919](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316234731919.png)

Download metadata 버튼을 클릭하여 `GoogleIDPMetadata.xml`을 다운로드한 후 Continue를 누릅니다.

![image-20240316234937484](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316234937484.png)

다음 매개변수를 지정합니다. "사전 작업"에서 확인한 User Pool ID와 "Cognito 구성: 도메인 설정"에서 설정한 도메인 이름을 사용합니다.

ACS URL

```
# 형식
https://<입력한-값>.auth.yourRegion.amazoncognito.com/saml2/idpresponse

# 예시
https://your-preferred-name-google.auth.ap-northeast-1.amazoncognito.com/saml2/idpresponse
```

Entity ID

```
# 형식
urn:amazon:cognito:sp:<UserPoolID>

# 예시
urn:amazon:cognito:sp:ap-northeast-1_Rxt6J1TtI
```

다음은 입력한 예시입니다. 입력 후 Continue를 누릅니다.

![image-20240316235220492](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316235220492.png)

속성에 대해 Google Directory 속성이 Cognito와 어떻게 통합될지 구성합니다. `Primary email`에 `email`을 지정합니다. 그런 다음 Finish를 누릅니다.

![image-20240316235522443](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316235522443.png)

애플리케이션이 구성되었습니다.

![image-20240316235732511](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316235732511.png)

# Google Workspace: 액세스 권한 설정

생성된 애플리케이션의 세부 화면을 열어 액세스 권한을 구성합니다. 세부 화면에서 "Off (all users)" 부분을 클릭합니다.

![image-20240317000224510](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317000224510.png)

이 샘플 절차에서는 "Company-wide" 조직에 속한 사용자에게 액세스 권한을 부여합니다. 전체 회사에 대해 "On"을 선택하고 Override를 누릅니다.  
이러한 액세스 권한 설정은 환경에 따라 세부적으로 구성할 수 있으므로 조직의 정책에 따라 수정하세요.

![image-20240317000758589](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317000758589.png)

On으로 변경되었습니다.

![image-20240317000846899](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317000846899.png)

# Cognito 구성: 페더레이션

AWS Management Console의 Cognito 구성으로 돌아갑니다.
Cognito User Pool 화면을 열고 Sign-in experience 탭으로 이동하여 Add identity provider를 선택합니다.

![image-20240128124451746](../assets/SAML_WITH_ENTRA_ID/image-20240128124451746.png)

Google Workspace 통합을 위해 SAML을 선택합니다. **Google이 아닌 SAML을 선택하세요.**

![image-20240128124529523](../assets/SAML_WITH_ENTRA_ID/image-20240128124529523.png)

Provider name 필드에 식별하기 쉬운 이름을 입력합니다. 여기서 지정한 Provider name은 나중 단계에서 cdk.json에 사용됩니다.
Choose file을 선택하고 Google Workspace에서 다운로드한 "GoogleIDPMetadata.xml"을 업로드합니다.

![image-20240317001734180](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317001734180.png)

User pool attribute에 email을 지정합니다.
SAML attribute에 `email`을 입력하고 Add identity provider를 선택합니다.

![image-20240317001748561](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317001748561.png)

구성이 추가되었습니다.

![image-20240317001814305](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317001814305.png)

# Cognito 구성: Hosted UI

Google Workspace 통합을 위해 Hosted UI를 구성합니다. App Integration 탭을 선택합니다.

![image-20240128125211108](../assets/SAML_WITH_ENTRA_ID/image-20240128125211108.png)

기존 App Client를 선택합니다.

![image-20240128125243769](../assets/SAML_WITH_ENTRA_ID/image-20240128125243769.png)

Edit를 누릅니다.

![image-20240128125314475](../assets/SAML_WITH_ENTRA_ID/image-20240128125314475.png)

[사전 작업](#사전-작업)에서 확인한 WebUrl 값을 Allowed callback URLs와 Allowed sign-out URLs 모두에 입력합니다.
프론트엔드 개발을 위해 [로컬 개발 환경](./DEVELOPMENT.md)을 사용하려면 Allowed callback URLs와 Allowed sign-out URLs 모두에 `http://localhost:5173`도 추가합니다.

![image-20240205185602299](../assets/SAML_WITH_ENTRA_ID/image-20240205185602299.png)

Identity Provider에 `GoogleWorkspace`를 선택합니다. 또한 Cognito 사용자 풀을 사용한 인증을 비활성화하려고 하므로 Cognito user pool 체크박스를 해제합니다.

![image-20240317002017655](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317002017655.png)

Save changes를 누릅니다.

![image-20240128132707060](../assets/SAML_WITH_ENTRA_ID/image-20240128132707060.png)

추가되었습니다.

![image-20240317125402303](../assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317125402303.png)

# cdk.json 편집

이제 구성이 완료되었으므로 cdk.json의 값을 수정합니다.

- samlAuthEnabled: `true`를 지정합니다. 이렇게 하면 SAML 전용 인증 화면으로 전환되며, Cognito 사용자 풀을 사용한 기존 인증 기능은 더 이상 사용할 수 없습니다.
- samlCognitoDomainName: "Cognito 구성: 도메인 설정"에서 지정한 Cognito Domain 이름을 입력합니다.
- samlCognitoFederatedIdentityProviderName: "Cognito 구성: 페더레이션"에서 구성한 Identity Provider 이름을 입력합니다.

```json
  "context": {
     <생략>
    "samlAuthEnabled": true,
    "samlCognitoDomainName": "your-preferred-name-google.auth.ap-northeast-1.amazoncognito.com",
    "samlCognitoFederatedIdentityProviderName": "GoogleWorkspace",
```

구성 후 재배포하여 SAML 통합을 활성화합니다.
