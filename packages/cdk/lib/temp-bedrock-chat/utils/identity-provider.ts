import { Effect, pipe } from "effect";
import { aws_cognito } from "aws-cdk-lib";

export type Idp = ReturnType<typeof identityProvider>;

export type TIdentityProvider = {
  /**
   * Service name for social providers.
   */
  service: string;
  /**
   * Service name for OIDC. Required when service is "oidc"
   */
  serviceName?: string;
  /**
   * Secret name of the secret in Secrets Manager.
   */
  secretName: string;
};

type NotFoundIdpArray = {
  type: "NotFoundIdpArray";
};

type InvalidSocialProvider = {
  type: "InvalidSocialProvider";
};
type Errors = NotFoundIdpArray | InvalidSocialProvider;

export const identityProvider = (identityProviders: TIdentityProvider[]) => {
  const isExist = () => identityProviders?.length > 0;

  const getProviders = (): TIdentityProvider[] => {
    const program = pipe(
      identityProviders,
      isIdpAsArray,
      Effect.flatMap(validateProviders)
    );
    const result = Effect.match(program, {
      onSuccess: (providers) => providers,
      onFailure: (error: Errors) => {
        if (error.type === "NotFoundIdpArray") return [] as TIdentityProvider[];
        if (error.type === "InvalidSocialProvider")
          throw new Error("InvalidSocialProvider");
        return error;
      },
    });
    return Effect.runSync(result);
  };

  const getSupportedIndetityProviders = () => {
    return [
      ...getProviders(),
      { service: "cognito", secretName: "" } as TIdentityProvider,
    ].map((provider) => {
      switch (provider.service) {
        case "google":
          return aws_cognito.UserPoolClientIdentityProvider.GOOGLE;
        case "facebook":
          return aws_cognito.UserPoolClientIdentityProvider.FACEBOOK;
        case "amazon":
          return aws_cognito.UserPoolClientIdentityProvider.AMAZON;
        case "apple":
          return aws_cognito.UserPoolClientIdentityProvider.APPLE;
        case "cognito":
          return aws_cognito.UserPoolClientIdentityProvider.COGNITO;
        case "oidc":
          return aws_cognito.UserPoolClientIdentityProvider.custom(
            provider.serviceName! // already validated
          );
        default:
          throw new Error(`Invalid identity provider: ${provider.service}`);
      }
    });
  };

  const getSocialProviders = () =>
    getProviders()
      .filter(({ service }) => service !== "oidc")
      .map(({ service }) => service)
      .join(",");

  const checkCustomProviderEnabled = () =>
    // Currently only support OIDC provider (SAML not supported)
    getProviders().some(({ service }) => service === "oidc");

  const getCustomProviderName = () =>
    // Currently only support OIDC provider (SAML not supported)
    getProviders().find(({ service }) => service === "oidc")?.serviceName;

  return {
    isExist,
    getProviders,
    getSupportedIndetityProviders,
    getSocialProviders,
    checkCustomProviderEnabled,
    getCustomProviderName,
  };
};

const validateProviders = (identityProviders: TIdentityProvider[]) =>
  Effect.all(identityProviders.map(validateSocialProvider));

const validateSocialProvider = (
  provider: TIdentityProvider
):
  | Effect.Effect<never, InvalidSocialProvider, never>
  | Effect.Effect<TIdentityProvider, never, never> => {
  if (
    !["google", "facebook", "amazon", "apple", "oidc"].includes(
      provider.service
    )
  ) {
    return Effect.fail({ type: "InvalidSocialProvider" });
  }

  if (provider.service === "oidc" && !provider.serviceName) {
    return Effect.fail({ type: "InvalidSocialProvider" });
  }

  return Effect.succeed(provider);
};

const isIdpAsArray = (
  identityProviders: TIdentityProvider[]
):
  | Effect.Effect<TIdentityProvider[], never, never>
  | Effect.Effect<never, NotFoundIdpArray, never> =>
  Array.isArray(identityProviders)
    ? Effect.succeed(identityProviders as TIdentityProvider[])
    : Effect.fail({ type: "NotFoundIdpArray" });
