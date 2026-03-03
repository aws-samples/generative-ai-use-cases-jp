#!/usr/bin/env node

/**
 * Get Cognito ID Token using SRP authentication
 * This script uses the default ALLOW_USER_SRP_AUTH flow
 */

const {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} = require('amazon-cognito-identity-js');

// Get parameters from environment variables
const userPoolId = process.env.VITE_APP_USER_POOL_ID;
const clientId = process.env.VITE_APP_USER_POOL_CLIENT_ID;
const username = process.env.COGNITO_EMAIL;
const password = process.env.COGNITO_PASSWORD;

if (!userPoolId || !clientId || !username || !password) {
  console.error('Error: Required environment variables not set');
  console.error(
    'Required: VITE_APP_USER_POOL_ID, VITE_APP_USER_POOL_CLIENT_ID, COGNITO_EMAIL, COGNITO_PASSWORD'
  );
  process.exit(1);
}

const poolData = {
  UserPoolId: userPoolId,
  ClientId: clientId,
};

const userPool = new CognitoUserPool(poolData);

const userData = {
  Username: username,
  Pool: userPool,
};

const cognitoUser = new CognitoUser(userData);

const authenticationData = {
  Username: username,
  Password: password,
};

const authenticationDetails = new AuthenticationDetails(authenticationData);

cognitoUser.authenticateUser(authenticationDetails, {
  onSuccess: (result) => {
    const idToken = result.getIdToken().getJwtToken();
    console.log(idToken);
    process.exit(0);
  },
  onFailure: (err) => {
    console.error('Authentication failed:', err.message);
    process.exit(1);
  },
});
