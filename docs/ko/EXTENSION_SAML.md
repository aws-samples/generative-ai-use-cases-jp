# 브라우저 확장 프로그램의 SAML 인증 방법

## 전제 조건

브라우저 확장 프로그램에서 SAML 인증을 수행하려면 GenU에서 SAML 통합을 미리 구성해야 합니다. [이 지침](./DEPLOY_OPTION.md#saml-authentication)을 참조하여 미리 설정을 완료하세요.

## 사용 방법

### 브라우저 확장 프로그램 빌드 및 설치

먼저 [이 가이드](/browser-extension/README_ko.md#usage)를 참조하여 브라우저 확장 프로그램을 빌드하고 설치합니다. GenU에서 SAML 통합을 구성한 후 확장 프로그램을 빌드하면 SAML 인증에 필요한 정보가 자동으로 설정되므로 GenU를 먼저 구성하는 것을 권장합니다.

### Cognito 구성

SAML 인증을 수행할 때 Cognito는 브라우저 확장 프로그램으로 콜백해야 합니다. 따라서 Cognito 애플리케이션 클라이언트의 콜백 URL에 브라우저 확장 프로그램의 URL을 추가해야 합니다.

#### 확장 프로그램 URL 확인

먼저 설치된 브라우저 확장 프로그램을 열고 "로그인 화면으로 이동" 버튼을 클릭합니다.

![상단](../assets/images/extension/saml_top.png)

위 화면 대신 일반 사용자 인증 화면이 표시되면 설정 화면을 열고 "SAML 인증"을 활성화한 다음 필요한 정보를 입력합니다. [이 방법](./EXTENSION_BUILD.md#기타-사용자-windows-등)을 사용하여 구성 값을 확인할 수 있습니다.
![설정](../assets/images/extension/saml_settings.png)

"로그인 화면으로 이동" 버튼을 클릭하면 아래와 같이 SAML 인증 화면이 "새 탭"에 나타납니다. Cognito가 구성되지 않았기 때문에 아직 로그인할 수 없습니다. Cognito 구성에서 사용하기 위해 이 화면의 URL을 복사하여 기록해 두세요.
![로그인](../assets/images/extension/saml_login.png)

#### Cognito Hosted UI 구성

GenU SAML 구성에서 Cognito Hosted UI를 설정했지만, 이제 확장 프로그램 URL을 "허용된 콜백 URL"로 추가해야 합니다. 자세한 내용은 다음 단계를 따르세요:

- [Microsoft Entra ID의 경우](./SAML_WITH_ENTRA_ID.md#cognito-구성-hosted-ui)
- [Google Workspace의 경우](./SAML_WITH_GOOGLE_WORKSPACE.md#cognito-구성-hosted-ui)

"확장 프로그램 URL 확인"에서 기록한 확장 프로그램 URL을 "허용된 콜백 URL"에 추가합니다. 확장 프로그램 URL은 다음 형식이어야 합니다:

```text
chrome-extension://ExtensionID/index.html
```

> [!IMPORTANT]
> Microsoft Edge를 사용하는 경우 브라우저의 URL은 `extension://ExtensionID/index.html`로 나타나지만, Cognito 구성에서는 `chrome-extension`을 사용해야 합니다.

### 확인

브라우저 확장 프로그램의 로그인 화면에서 SAML 인증을 수행합니다. 인증이 성공하면 아래와 같은 화면이 표시됩니다.
![로그인됨](../assets/images/extension/saml_loggedin.png)
