import json

def handler(event, context):
    """
    Cognito Pre Token Generation trigger (V2) to add tenant ID to JWT claims.
    This enables Cognito Identity Pool to map claims to principal tags for ABAC.
    """
    try:
        print(f"Pre Token Generation Event: {json.dumps(event, indent=2)}")
        
        user_attributes = event["request"]["userAttributes"]
        tenant_id = user_attributes.get("custom:tenant_id", "default")
        tenant_admin = user_attributes.get("custom:tenantAdmin", "false")
        
        # For Identity Pool Enhanced Flow, we only need to ensure the custom:tenant_id
        # claim is present in the JWT. The Identity Pool will automatically map
        # this to the TenantID principal tag based on the principalTags configuration.
        # Also include tenantAdmin claim for application-level authorization.
        event["response"]["claimsAndScopeOverrideDetails"] = {
            "idTokenGeneration": {
                "claimsToAddOrOverride": {
                    # Add tenant ID as a claim - this will be mapped to principal tag by Identity Pool
                    "custom:tenant_id": tenant_id,
                    # Add tenant admin status for application-level authorization
                    "custom:tenantAdmin": tenant_admin
                }
            },
            "accessTokenGeneration": {
                "claimsToAddOrOverride": {
                    "custom:tenant_id": tenant_id,
                    "custom:tenantAdmin": tenant_admin
                }
            }
        }
        
        print(f"Token generation response: {json.dumps(event['response'], indent=2)}")
        return event
        
    except Exception as e:
        print(f"Error in pre-token generation: {str(e)}")
        # Return the event unchanged to avoid breaking authentication
        return event
