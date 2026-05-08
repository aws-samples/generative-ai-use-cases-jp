# Microsoft Entra ID와 SAML 통합

이 가이드는 Microsoft Entra ID(이전 Azure Active Directory)와 SAML을 통합하는 참조 절차를 소개합니다. 세부 매개변수는 환경에 맞게 수정하세요.

# 사전 작업

먼저 GenU를 배포합니다. 초기 배포 후 Cognito와 Entra ID 간의 SAML 통합을 설정합니다.

CloudFormation Stack 화면의 Outputs 탭을 열고 WebUrl을 기록해 둡니다.

![image-20240205185011526](../assets/SAML_WITH_ENTRA_ID/image-20240205185011526.png)

다음으로 Resource 탭에서 Cognito 사용자 풀의 Physical ID를 기록해 둡니다.

![image-20240128114108630](../assets/SAML_WITH_ENTRA_ID/image-20240128114108630.png)

# Cognito 구성: 도메인 설정

Cognito 도메인 구성을 진행합니다.
Cognito 사용자 풀 화면에서 App integration 탭을 열고 Domain 화면을 표시합니다. Cognito Domain이 비어 있으므로 Actions에서 Create Cognito domain을 선택합니다.

![image-20240128115029927](../assets/SAML_WITH_ENTRA_ID/image-20240128115029927.png)

적절한 이름을 할당하고 Create Cognito domain을 누릅니다. 이 절차에서는 `your-preferred-name`을 사용합니다. 전역적으로 고유한 이름을 사용해야 합니다.

![image-20240128115448597](../assets/SAML_WITH_ENTRA_ID/image-20240128115448597.png)

Cognito 도메인이 구성되었습니다.

![image-20240128115539920](../assets/SAML_WITH_ENTRA_ID/image-20240128115539920-1707114112930.png)

# Microsoft Entra ID 구성

Microsoft Entra ID(이전 Azure Active Directory)에서 SAML 통합을 활성화합니다.

Microsoft Azure에서 Microsoft Entra ID 구성 화면을 엽니다.

![image-20240128121313366](../assets/SAML_WITH_ENTRA_ID/image-20240128121313366.png)

Enterprise Applications를 선택합니다.

![image-20240128121505749](../assets/SAML_WITH_ENTRA_ID/image-20240128121505749.png)

New application을 선택합니다.

![image-20240128121555503](../assets/SAML_WITH_ENTRA_ID/image-20240128121555503.png)

Create your own application을 선택합니다.

![image-20240128121629558](../assets/SAML_WITH_ENTRA_ID/image-20240128121629558-1707115633384.png)

임의의 애플리케이션 이름을 입력하고 Create를 누릅니다. 이 예시에서는 `generative-ai-use-cases`를 사용합니다.

![image-20240128121916888](../assets/SAML_WITH_ENTRA_ID/image-20240128121916888.png)

Single sign-on 메뉴에서 SAML을 선택합니다.

![image-20240128122006365](../assets/SAML_WITH_ENTRA_ID/image-20240128122006365.png)

Basic SAML Configuration에서 Edit를 누릅니다.

![image-20240128122115335](../assets/SAML_WITH_ENTRA_ID/image-20240128122115335.png)

다음 매개변수를 입력하고 save를 누릅니다. [사전 작업](#사전-작업)에서 확인한 Cognito 사용자 풀 ID와 [Cognito 구성: 도메인 설정](#cognito-구성-도메인-설정)에서 확인한 Domain 값을 사용합니다.

Identifier (Entity ID)

```
# 형식
urn:amazon:cognito:sp:<UserPoolID>

# 예시
urn:amazon:cognito:sp:ap-northeast-1_p0oD4M3F0
```

Reply URL (Assertion Consumer Service URL)

```
# 형식
https://<입력한-값>.auth.yourRegion.amazoncognito.com/saml2/idpresponse

# 예시
https://your-preferred-name.auth.ap-northeast-1.amazoncognito.com/saml2/idpresponse
```

값을 지정하고 Save를 누릅니다.

![image-20240128122339147](../assets/SAML_WITH_ENTRA_ID/image-20240128122339147.png)

설정이 적용되었습니다.

![image-20240128122454341](../assets/SAML_WITH_ENTRA_ID/image-20240128122454341.png)

Federation Metadata XML 아래의 Download를 선택하여 XML 파일을 획득합니다.

![image-20240128122534056](../assets/SAML_WITH_ENTRA_ID/image-20240128122534056.png)

이 애플리케이션과 연결할 사용자 또는 그룹을 추가합니다. 여기에 연결된 사용자와 그룹만 로그인할 수 있습니다.

![image-20240128122707248](../assets/SAML_WITH_ENTRA_ID/image-20240128122707248.png)

이 예시에서는 미리 생성된 사용자를 지정합니다. 환경에 따라 지정하세요.

![image-20240128122807048](../assets/SAML_WITH_ENTRA_ID/image-20240128122807048.png)

Assign을 누릅니다.

![image-20240128122832158](../assets/SAML_WITH_ENTRA_ID/image-20240128122832158.png)

# Cognito 구성: 페더레이션

AWS Management Console의 Cognito 구성으로 돌아갑니다.
Cognito User Pool 화면을 열고 Sign-in experience 탭에서 Add identity provider를 선택합니다.

![image-20240128124451746](../assets/SAML_WITH_ENTRA_ID/image-20240128124451746.png)

Entra ID와의 통합에 SAML을 사용하므로 SAML을 선택합니다.

![image-20240128124529523](../assets/SAML_WITH_ENTRA_ID/image-20240128124529523.png)

Provider name 필드에 식별하기 쉬운 이름을 입력합니다. 여기서 지정한 Provider name은 나중 단계에서 cdk.json에 포함됩니다.
Choose file을 선택하고 Entra ID에서 다운로드한 "Federation Metadata XML"을 업로드합니다.

![image-20240128124624371](../assets/SAML_WITH_ENTRA_ID/image-20240128124624371.png)

User pool attribute에 email을 지정합니다.
SAML attribute에는 다음 문자열을 선택한 후 Add identity provider를 선택합니다.

```
http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress
```

![image-20240128124827012](../assets/SAML_WITH_ENTRA_ID/image-20240128124827012.png)

구성이 추가되었습니다.

![image-20240128125053814](../assets/SAML_WITH_ENTRA_ID/image-20240128125053814.png)

# Cognito 구성: Hosted UI

이제 Entra ID 통합을 사용하도록 Hosted UI를 구성합니다. App Integration 탭을 선택합니다.

![image-20240128125211108](../assets/SAML_WITH_ENTRA_ID/image-20240128125211108.png)

기존 App Client를 지정합니다.

![image-20240128125243769](../assets/SAML_WITH_ENTRA_ID/image-20240128125243769.png)

Edit를 누릅니다.

![image-20240128125314475](../assets/SAML_WITH_ENTRA_ID/image-20240128125314475.png)

[사전 작업](#사전-작업)에서 확인한 WebUrl 값을 Allowed callback URLs와 Allowed sign-out URLs 모두에 입력합니다.
프론트엔드 개발을 위해 [로컬 개발 환경](./DEVELOPMENT.md)을 사용하려면 Allowed callback URLs와 Allowed sign-out URLs 모두에 `http://localhost:5173`도 추가합니다.

![image-20240205185602299](../assets/SAML_WITH_ENTRA_ID/image-20240205185602299.png)

Identity Provider에 EntraID를 선택합니다. 또한 Cognito 사용자 풀을 사용한 인증을 중단하려고 하므로 Cognito user pool 체크박스를 해제합니다.

![image-20240207123836497](../assets/SAML_WITH_ENTRA_ID/image-20240207123836497.png)

Save changes를 누릅니다.

![image-20240128132707060](../assets/SAML_WITH_ENTRA_ID/image-20240128132707060.png)

구성이 추가되었습니다.

![image-20240128132652553](../assets/SAML_WITH_ENTRA_ID/image-20240128132652553.png)

# cdk.json 편집

이제 구성이 완료되었으므로 cdk.json의 값을 수정합니다.

- samlAuthEnabled: `true`를 지정합니다. 이렇게 하면 SAML 전용 인증 화면으로 전환되며, Cognito 사용자 풀을 사용한 기존 인증 기능은 더 이상 사용할 수 없습니다.
- samlCognitoDomainName: ["Cognito 구성: 도메인 설정"](#cognito-구성-도메인-설정)에서 지정한 Cognito Domain 이름을 입력합니다.
- samlCognitoFederatedIdentityProviderName: ["Cognito 구성: 페더레이션"](#cognito-구성-페더레이션)에서 구성한 Identity Provider 이름을 입력합니다.

```json
  "context": {
　　 <생략>
    "samlAuthEnabled": true,
    "samlCognitoDomainName": "your-preferred-name.auth.ap-northeast-1.amazoncognito.com",
    "samlCognitoFederatedIdentityProviderName": "EntraID",
```

구성 후 다시 배포하여 SAML 통합을 활성화합니다.

---

# (선택사항) SAML IdP 그룹 사용자 정의 속성 구성

이 섹션에서는 SAML IdP에서 관리하는 역할 또는 그룹을 RAG 필터링을 위해 Cognito 속성에 매핑하는 방법을 소개합니다.

먼저 Entra ID Enterprise Application 화면에서 Attributes & Claims의 Edit를 선택하여 편집합니다.

![image-20250109000000001](../assets/SAML_WITH_ENTRA_ID/image-20250109000000001.png)

Add a group claim에서 Group Claim을 추가합니다. 요구사항에 따라 애플리케이션과 공유할 그룹의 범위를 선택합니다. (자세한 내용은 [여기](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims)에서 확인할 수 있습니다)

![image-20250109000000002](../assets/SAML_WITH_ENTRA_ID/image-20250109000000002.png)

다음으로 Cognito User Pool 화면에서 Sign-up에서 Custom attributes 추가 화면을 엽니다.

![image-20250109000000003](../assets/SAML_WITH_ENTRA_ID/image-20250109000000003.png)

적절한 이름으로 Custom Attribute를 생성합니다. 이 예시에서는 `idpGroup`을 사용합니다.

![image-20250109000000004](../assets/SAML_WITH_ENTRA_ID/image-20250109000000004.png)

다음으로 Social Identity Provider 화면에서 Attribute mapping 화면을 엽니다.

![image-20250109000000005](../assets/SAML_WITH_ENTRA_ID/image-20250109000000005.png)

앞서 생성한 Custom Attribute 이름을 Entra ID Group Claim `http://schemas.microsoft.com/ws/2008/06/identity/claims/groups`와 매핑합니다.

![image-20250109000000006](../assets/SAML_WITH_ENTRA_ID/image-20250109000000006.png)

이것으로 Entra ID에서 정의된 그룹을 Cognito 속성에 매핑하는 것이 완료되었습니다.

Custom Attribute는 ID 토큰에 포함되므로 이제 애플리케이션에서 사용할 수 있습니다.

Knowledge Base RAG 필터링에 사용하려면 `packages/common/src/custom/rag-knowledge-base.ts`의 `getDynamicFilters` 함수에서 `Example2`의 주석을 해제합니다.

```typescript
// Example 2: SAML IdP 그룹 사용자 정의 속성으로 필터링 (docs/SAML_WITH_ENTRA_ID.md에서 속성 매핑 설정 단계 확인)

const groups = (idTokenPayload['custom:idpGroup'] as string) // 그룹을 문자열로 저장 (예: [group1id, group2id])
  .slice(1, -1) // 첫 번째와 마지막 대괄호 제거
  .split(/, ?/) // 쉼표와 선택적 공백으로 분할
  .filter(Boolean); // 빈 문자열 제거
if (!groups) throw new Error('custom:idpGroup is not set'); // 그룹이 설정되지 않은 경우 오류, 액세스 방지
const groupFilter: RetrievalFilter = {
  in: {
    key: 'group',
    value: groups,
  },
};
dynamicFilters.push(groupFilter);
```

문서의 그룹 메타데이터가 사용자의 IdP 그룹의 Object ID를 지정할 때 필터링이 적용됩니다.

마찬가지로 Cognito Custom Attribute와 Attribute Mapping을 사용하여 다른 메타데이터도 활용할 수 있습니다.
