#!/usr/bin/env node

/**
 * Get Cognito ID Token using SRP authentication
 * Optimized using AWS SDK v3 (@aws-sdk/client-cognito-identity-provider)
 *
 */

const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

// 1. Fail fast: Validate environment variables immediately
const {
  VITE_APP_USER_POOL_ID: userPoolId,
  VITE_APP_USER_POOL_CLIENT_ID: clientId,
  COGNITO_EMAIL: username,
  COGNITO_PASSWORD: password
} = process.env;

if (!userPoolId || !clientId || !username || !password) {
  console.error('Error: Missing required environment variables.');
  console.error('Required: VITE_APP_USER_POOL_ID, VITE_APP_USER_POOL_CLIENT_ID, COGNITO_EMAIL, COGNITO_PASSWORD');
  process.exit(1);
}

// 2. Extract region directly from the User Pool ID (e.g., "us-east-1_xxxxxxxxx")
const region = userPoolId.split('_')[0];

async function getTokens() {
  // 3. Initialize the modern lightweight v3 client
  const client = new CognitoIdentityProviderClient({ region });

  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH', // More reliable for pure server-side Node.js CLI execution
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });

  try {
    const response = await client.send(command);
    
    if (response.AuthenticationResult?.IdToken) {
      console.log(response.AuthenticationResult.IdToken);
      process.exit(0);
    } else {
      throw new Error('Authentication succeeded but no IdToken was returned.');
    }
  } catch (error) {
    console.error('Authentication failed:', error.message);
    process.exit(1);
  }
}

getTokens();
