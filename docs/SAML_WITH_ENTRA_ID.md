# SAML Integration with Microsoft Entra ID

This document introduces a reference procedure for integrating with Microsoft Entra ID (formerly Azure Active Directory) using SAML. Please modify the detailed parameters according to your environment.

# Prerequisites
Deploy GenU for the first time. After the initial deployment, integrate Cognito with Entra ID using SAML.

Open the Outputs tab in the CloudFormation Stack screen and note down the WebUrl.

![image-20240205185011526](assets/SAML_WITH_ENTRA_ID/image-20240205185011526.png)

Next, open the Resource tab and note down the Physical ID of the Cognito user pool.

![image-20240128114108630](assets/SAML_WITH_ENTRA_ID/image-20240128114108630.png)

# Cognito Configuration: Domain Setup
Proceed with the Cognito domain setup.
Open the Cognito user pool screen, go to the App integration tab, and display the Domain-related screen. Since the Cognito Domain is blank, select Create Cognito domain from Actions.

![image-20240128115029927](assets/SAML_WITH_ENTRA_ID/image-20240128115029927.png)

Assign an arbitrary name and click Create Cognito domain. In this procedure, we'll use `your-preferred-name`. You need to assign a globally unique name.

![image-20240128115448597](assets/SAML_WITH_ENTRA_ID/image-20240128115448597.png)

The Cognito domain has been set up.

![image-20240128115539920](assets/SAML_WITH_ENTRA_ID/image-20240128115539920-1707114112930.png)

# Microsoft Entra ID Configuration
Enable SAML integration in Microsoft Entra ID (formerly Azure Active Directory).

Open the Microsoft Entra ID configuration screen from Microsoft Azure.

![image-20240128121313366](assets/SAML_WITH_ENTRA_ID/image-20240128121313366.png)

Select Enterprise Applications.

![image-20240128121505749](assets/SAML_WITH_ENTRA_ID/image-20240128121505749.png)

Select New application.

![image-20240128121555503](assets/SAML_WITH_ENTRA_ID/image-20240128121555503.png)

Select Create your own application.

![image-20240128121629558](assets/SAML_WITH_ENTRA_ID/image-20240128121629558-1707115633384.png)

Enter an arbitrary application name and click Create. In this example, we'll use `generative-ai-use-cases-jp`.

![image-20240128121916888](assets/SAML_WITH_ENTRA_ID/image-20240128121916888.png)

From the Single sign-on menu, select SAML.

![image-20240128122006365](assets/SAML_WITH_ENTRA_ID/image-20240128122006365.png)

Click Edit in the Basic SAML Configuration section.

![image-20240128122115335](assets/SAML_WITH_ENTRA_ID/image-20240128122115335.png)

Enter the following parameters and click Save. Use the Cognito user pool ID confirmed in the [Prerequisites](#prerequisites) and the Domain value confirmed in the [Cognito Configuration: Domain Setup](#cognito-configuration-domain-setup) sections.

Identifier (Entity ID)

```
# Format
urn:amazon:cognito:sp:<UserPoolID>

# Example
urn:amazon:cognito:sp:ap-northeast-1_p0oD4M3F0
```

Reply URL (Assertion Consumer Service URL)

```
# Format
https://<value_you_entered>.auth.yourRegion.amazoncognito.com/saml2/idpresponse

# Example
https://your-preferred-name.auth.ap-northeast-1.amazoncognito.com/saml2/idpresponse
```

Specify the values and click Save.

![image-20240128122339147](assets/SAML_WITH_ENTRA_ID/image-20240128122339147.png)

The configuration has been applied.

![image-20240128122454341](assets/SAML_WITH_ENTRA_ID/image-20240128122454341.png)

Select Download for Federation Metadata XML to obtain the XML file.

![image-20240128122534056](assets/SAML_WITH_ENTRA_ID/image-20240128122534056.png)

Add the users or groups to be associated with this application. Only the users or groups assigned here will be able to log in.

![image-20240128122707248](assets/SAML_WITH_ENTRA_ID/image-20240128122707248.png)

In this example, we'll specify a user that was created beforehand. Specify according to your environment.

![image-20240128122807048](assets/SAML_WITH_ENTRA_ID/image-20240128122807048.png)

Click Assign.

![image-20240128122832158](assets/SAML_WITH_ENTRA_ID/image-20240128122832158.png)

# Cognito Configuration: Federation

Return to the Cognito configuration in the AWS Management Console.
Open the Cognito User Pool screen and select Add identity provider from the Sign-in experience tab.

![image-20240128124451746](assets/SAML_WITH_ENTRA_ID/image-20240128124451746.png)

Since we're using SAML for the Entra ID integration, select SAML.

![image-20240128124529523](assets/SAML_WITH_ENTRA_ID/image-20240128124529523.png)

Enter an arbitrary identifiable name in Provider name. You'll need to specify this Provider name in cdk.json in a later step.
Click Choose file and upload the "Federation Metadata XML" downloaded from Entra ID.

![image-20240128124624371](assets/SAML_WITH_ENTRA_ID/image-20240128124624371.png)

Specify email in the User pool attribute.
Select the following string for SAML attribute and click Add identity provider.

```
http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress
```

![image-20240128124827012](assets/SAML_WITH_ENTRA_ID/image-20240128124827012.png)

The configuration has been added.

![image-20240128125053814](assets/SAML_WITH_ENTRA_ID/image-20240128125053814.png)

# Cognito Configuration: Hosted UI

Configure the added Entra ID integration for use with the Hosted UI. Select the App Integration tab.

![image-20240128125211108](assets/SAML_WITH_ENTRA_ID/image-20240128125211108.png)

Specify an existing App Client.

![image-20240128125243769](assets/SAML_WITH_ENTRA_ID/image-20240128125243769.png)

Click Edit.

![image-20240128125314475](assets/SAML_WITH_ENTRA_ID/image-20240128125314475.png)

Enter the WebUrl value confirmed in the [Prerequisites](#prerequisites) section in Allowed callback URLs and Allowed sign-out URLs.
If you want to develop the frontend using the [local development environment](/docs/DEVELOPMENT.md), also add `http://localhost:5173` to Allowed callback URLs and Allowed sign-out URLs.

![image-20240205185602299](assets/SAML_WITH_ENTRA_ID/image-20240205185602299.png)

Select EntraID for Identity Provider. Since we want to stop using Cognito user pool authentication, uncheck the Cognito user pool checkbox.

![image-20240207123836497](assets/SAML_WITH_ENTRA_ID/image-20240207123836497.png)

Click Save changes.

![image-20240128132707060](assets/SAML_WITH_ENTRA_ID/image-20240128132707060.png)

It has been added.

![image-20240128132652553](assets/SAML_WITH_ENTRA_ID/image-20240128132652553.png)

# Editing cdk.json

The setup is now complete, so modify the values in cdk.json.

- samlAuthEnabled: Specify `true`. The authentication screen will switch to a SAML-only screen, and the traditional authentication functionality using Cognito user pools will no longer be available.
- samlCognitoDomainName: Enter the Cognito Domain name specified in the [Cognito Configuration: Domain Setup](#cognito-configuration-domain-setup) section.
- samlCognitoFederatedIdentityProviderName: Enter the name of the Identity Provider configured in the [Cognito Configuration: Federation](#cognito-configuration-federation) section.

```json
  "context": {
　　 <omitted>
    "samlAuthEnabled": true,
    "samlCognitoDomainName": "your-preferred-name.auth.ap-northeast-1.amazoncognito.com",
    "samlCognitoFederatedIdentityProviderName": "EntraID",
```

After making the changes, redeploy to enable SAML integration.
