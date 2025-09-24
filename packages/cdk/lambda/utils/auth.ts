import { JwtRsaVerifier } from 'aws-jwt-verify';
import { CognitoIdTokenPayload } from 'aws-jwt-verify/jwt-model';

export const verifyToken = async (
  token: string
): Promise<CognitoIdTokenPayload | undefined> => {
  try {
    const region = process.env.AWS_REGION!;
    const userPoolId = process.env.USER_POOL_ID!;
    const clientId = process.env.USER_POOL_CLIENT_ID!;
    const proxyEndpoint = process.env.USER_POOL_PROXY_ENDPOINT!;

    const jwksUri =
      proxyEndpoint.length > 0
        ? `${proxyEndpoint}${userPoolId}/.well-known/jwks.json`
        : `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;

    const verifier = JwtRsaVerifier.create({
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
      audience: clientId,
      jwksUri,
      tokenUse: 'id',
    });

    const payload = await verifier.verify(token);
    return payload as CognitoIdTokenPayload;
  } catch {
    return undefined;
  }
};
