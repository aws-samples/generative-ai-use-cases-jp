import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { CognitoIdTokenPayload } from 'aws-jwt-verify/jwt-model';

export const verifyToken = async (
  token: string
): Promise<CognitoIdTokenPayload | undefined> => {
  try {
    const verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.USER_POOL_ID || '',
      tokenUse: 'id',
      clientId: process.env.USER_POOL_CLIENT_ID || '',
    });
    const payload = await verifier.verify(token);
    return payload;
  } catch {
    return undefined;
  }
};
