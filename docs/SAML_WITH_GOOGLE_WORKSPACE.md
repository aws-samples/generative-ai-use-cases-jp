# SAML Integration with Google Workspace

This document introduces a reference procedure for integrating with Google Workspace using SAML. Please modify the detailed parameters according to your environment.

# Prerequisites
Deploy GenU for the first time. After the initial deployment, integrate Cognito with Google Workspace using SAML.

Open the Outputs tab in the CloudFormation Stack screen and note down the WebUrl.

![image-20240205185011526](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240205185011526.png)

Next, open the Resource tab and note down the Physical ID of the Cognito user pool.

![image-20240317105731051](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317105731051.png)

# Cognito Configuration: Domain Setup
Proceed with the Cognito domain setup.
Open the Cognito user pool screen, go to the App integration tab, and display the Domain-related screen. Since the Cognito Domain is blank, select Create Cognito domain from Actions.

![image-20240128115029927](assets/SAML_WITH_ENTRA_ID/image-20240128115029927.png)

Assign an arbitrary name and click Create Cognito domain. In this procedure, we'll use `your-preferred-name-google`. You need to assign a globally unique name.

![image-20240316234530866](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316234530866.png)

The Cognito domain has been set up.

![image-20240316234607065-1710645672447-1710645678992](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316234607065-1710645672447-1710645678992.png)

# Google Workspace Configuration: SAML Application

Open the Google Workspace admin console from the following URL and proceed with the SAML configuration.
https://admin.google.com/u/0/ac/home

From the application settings screen, click Add custom SAML app.

![image-20240316233910260](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316233910260.png)

Enter a name for the Google Workspace admin. You can choose any name. In this example, we'll use `generative-ai-use-cases-jp`.

![image-20240316234731919](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316234731919.png)

Click the Download metadata button to download `GoogleIDPMetadata.xml`, then click Continue.

![image-20240316234937484](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316234937484.png)

Specify the following parameters. Use the User Pool ID confirmed in the [Prerequisites](#prerequisites) section and the domain name set in the [Cognito Configuration: Domain Setup](#cognito-configuration-domain-setup) section.

ACS URL

```
# Format
https://<value_you_entered>.auth.yourRegion.amazoncognito.com/saml2/idpresponse

# Example
https://your-preferred-name-google.auth.ap-northeast-1.amazoncognito.com/saml2/idpresponse
```

Entity ID

```
# Format
urn:amazon:cognito:sp:<UserPoolID>

# Example
urn:amazon:cognito:sp:ap-northeast-1_Rxt6J1TtI
```

Here's an example of the input. After entering the values, click Continue.

![image-20240316235220492](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316235220492.png)

In the Attributes section, configure how the attributes in the Google Directory will be mapped to Cognito. Specify `email` for `Primary email`. Then click Finish.

![image-20240316235522443](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316235522443.png)

The application has been configured.

![image-20240316235732511](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240316235732511.png)

# Google Workspace: Access Permission Settings

Open the details screen of the created application and configure the access permissions. From the details screen, click "Off (all users)" to set the access permissions.

![image-20240317000224510](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317000224510.png)

In this sample procedure, we'll grant access permissions to users belonging to the "Company-wide" organization. Select "On" for "Company-wide" and click Override.
You can configure these access permissions in detail according to your organization's policies, so please modify them based on your environment.

![image-20240317000758589](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317000758589.png)

It has been changed to "On".

![image-20240317000846899](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317000846899.png)

# Cognito Configuration: Federation

Return to the Cognito configuration in the AWS Management Console.
Open the Cognito User Pool screen and select Add identity provider from the Sign-in experience tab.

![image-20240128124451746](assets/SAML_WITH_ENTRA_ID/image-20240128124451746.png)

Since we're using SAML for the Google Workspace integration, select SAML. **Do not select Google, select SAML.**

![image-20240128124529523](assets/SAML_WITH_ENTRA_ID/image-20240128124529523.png)

Enter an arbitrary identifiable name in Provider name. You'll need to specify this Provider name in cdk.json in a later step.
Click Choose file and upload the "GoogleIDPMetadata.xml" downloaded from Google Workspace.

![image-20240317001734180](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317001734180.png)

Specify email in the User pool attribute.
Enter `email` in SAML attribute and select Add identity provider.

![image-20240317001748561](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317001748561.png)

The configuration has been added.

![image-20240317001814305](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317001814305.png)

# Cognito Configuration: Hosted UI

Configure the Google Workspace integration for use with the Hosted UI. Select the App Integration tab.

![image-20240128125211108](assets/SAML_WITH_ENTRA_ID/image-20240128125211108.png)

Specify an existing App Client.

![image-20240128125243769](assets/SAML_WITH_ENTRA_ID/image-20240128125243769.png)

Click Edit.

![image-20240128125314475](assets/SAML_WITH_ENTRA_ID/image-20240128125314475.png)

Enter the WebUrl value confirmed in the [Prerequisites](#prerequisites) section in Allowed callback URLs and Allowed sign-out URLs.
If you want to develop the frontend using the [local development environment](/docs/DEVELOPMENT.md), also add `http://localhost:5173` to Allowed callback URLs and Allowed sign-out URLs.

![image-20240205185602299](assets/SAML_WITH_ENTRA_ID/image-20240205185602299.png)

Select `GoogleWorkspace` for Identity Provider. Since we want to stop using Cognito user pool authentication, uncheck the Cognito user pool checkbox.

![image-20240317002017655](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317002017655.png)

Click Save changes.

![image-20240128132707060](assets/SAML_WITH_ENTRA_ID/image-20240128132707060.png)

It has been added.

![image-20240317125402303](assets/SAML_WITH_GOOGLE_WORKSPACE/image-20240317125402303.png)

# Editing cdk.json

The setup is now complete, so modify the values in cdk.json.

- samlAuthEnabled: Specify `true`. The authentication screen will switch to a SAML-only screen, and the traditional authentication functionality using Cognito user pools will no longer be available.
- samlCognitoDomainName: Enter the Cognito Domain name specified in the [Cognito Configuration: Domain Setup](#cognito-configuration-domain-setup) section.
- samlCognitoFederatedIdentityProviderName: Enter the name of the Identity Provider configured in the [Cognito Configuration: Federation](#cognito-configuration-federation) section.

```json
  "context": {
　　 <omitted>
    "samlAuthEnabled": true,
    "samlCognitoDomainName": "your-preferred-name-google.auth.ap-northeast-1.amazoncognito.com",
    "samlCognitoFederatedIdentityProviderName": "GoogleWorkspace",
```

After making the changes, redeploy to enable SAML integration.
