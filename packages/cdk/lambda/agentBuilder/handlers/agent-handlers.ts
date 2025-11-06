import { APIGatewayProxyResult } from 'aws-lambda';
import {
  CreateAgentRequest,
  UpdateAgentRequest,
  CloneAgentRequest,
} from 'generative-ai-use-cases';
import * as agentService from '../services/agent-service';
import {
  validateUserId,
  validateAgentId,
  validateCloneAgentRequest,
} from '../validation/request-validation';
import {
  validateCreateAgentRequest,
  validateUpdateAgentRequest,
} from '../validation/agent-validation';
import { createSuccessResponse } from '../utils/response-utils';
import { handleError, ValidationError } from '../utils/error-handling';

/**
 * Handle create agent request
 */
export async function handleCreateAgent(
  userId: string,
  request: CreateAgentRequest
): Promise<APIGatewayProxyResult> {
  try {
    // Input validation (data format, types, required fields)
    const userValidation = validateUserId(userId);
    if (!userValidation.isValid) {
      throw new ValidationError(userValidation.error!);
    }

    const validation = validateCreateAgentRequest(request);
    if (!validation.isValid) {
      throw new ValidationError(validation.error!);
    }

    // Service layer handles business logic with validated data
    const agent = await agentService.createAgent(userId, validation.data!);
    return createSuccessResponse(agent, 201);
  } catch (error) {
    return handleError(error as Error);
  }
}

/**
 * Handle get agent request
 */
export async function handleGetAgent(
  userId: string,
  agentId: string
): Promise<APIGatewayProxyResult> {
  try {
    // Validate user ID
    const userValidation = validateUserId(userId);
    if (!userValidation.isValid) {
      throw new ValidationError(userValidation.error!);
    }

    // Validate agent ID
    const agentValidation = validateAgentId(agentId);
    if (!agentValidation.isValid) {
      throw new ValidationError(agentValidation.error!);
    }

    // Get agent
    const agent = await agentService.getAgent(userId, agentId);

    return createSuccessResponse(agent);
  } catch (error) {
    return handleError(error as Error);
  }
}

/**
 * Handle update agent request
 */
export async function handleUpdateAgent(
  userId: string,
  agentId: string,
  request: UpdateAgentRequest
): Promise<APIGatewayProxyResult> {
  try {
    // Input validation (data format, types, required fields)
    const userValidation = validateUserId(userId);
    if (!userValidation.isValid) {
      throw new ValidationError(userValidation.error!);
    }

    const agentValidation = validateAgentId(agentId);
    if (!agentValidation.isValid) {
      throw new ValidationError(agentValidation.error!);
    }

    const validation = validateUpdateAgentRequest(request);
    if (!validation.isValid) {
      throw new ValidationError(validation.error!);
    }

    // Service layer handles business logic with validated data
    const agent = await agentService.updateAgent(
      userId,
      agentId,
      validation.data!
    );
    return createSuccessResponse(agent);
  } catch (error) {
    return handleError(error as Error);
  }
}

/**
 * Handle delete agent request
 */
export async function handleDeleteAgent(
  userId: string,
  agentId: string
): Promise<APIGatewayProxyResult> {
  try {
    // Validate user ID
    const userValidation = validateUserId(userId);
    if (!userValidation.isValid) {
      throw new ValidationError(userValidation.error!);
    }

    // Validate agent ID
    const agentValidation = validateAgentId(agentId);
    if (!agentValidation.isValid) {
      throw new ValidationError(agentValidation.error!);
    }

    // Delete agent
    await agentService.deleteAgent(userId, agentId);

    return createSuccessResponse({ message: 'Agent deleted successfully' });
  } catch (error) {
    return handleError(error as Error);
  }
}

/**
 * Handle list user agents request
 */
export async function handleListUserAgents(
  userId: string,
  exclusiveStartKey?: string,
  limit?: number
): Promise<APIGatewayProxyResult> {
  try {
    // Validate user ID
    const userValidation = validateUserId(userId);
    if (!userValidation.isValid) {
      throw new ValidationError(userValidation.error!);
    }

    // List agents
    const result = await agentService.listUserAgents(
      userId,
      limit,
      exclusiveStartKey
    );

    return createSuccessResponse(result);
  } catch (error) {
    return handleError(error as Error);
  }
}

/**
 * Handle list public agents request
 */
export async function handleListPublicAgents(
  userId: string,
  exclusiveStartKey?: string,
  limit?: number
): Promise<APIGatewayProxyResult> {
  try {
    // Input validation
    const userValidation = validateUserId(userId);
    if (!userValidation.isValid) {
      throw new ValidationError(userValidation.error!);
    }

    // Service layer handles business logic
    const result = await agentService.listPublicAgents(
      userId,
      limit,
      exclusiveStartKey
    );
    return createSuccessResponse(result);
  } catch (error) {
    return handleError(error as Error);
  }
}

/**
 * Handle clone agent request
 */
export async function handleCloneAgent(
  userId: string,
  request: CloneAgentRequest
): Promise<APIGatewayProxyResult> {
  try {
    // Input validation
    const userValidation = validateUserId(userId);
    if (!userValidation.isValid) {
      throw new ValidationError(userValidation.error!);
    }

    const validation = validateCloneAgentRequest(request);
    if (!validation.isValid) {
      throw new ValidationError(validation.error!);
    }

    // Service layer handles business logic with validated data
    const agent = await agentService.cloneAgent(userId, validation.data!);
    return createSuccessResponse(agent);
  } catch (error) {
    return handleError(error as Error);
  }
}

/**
 * Handle list favorite agents request
 */
export async function handleListFavoriteAgents(
  userId: string,
  exclusiveStartKey?: string,
  limit?: number
): Promise<APIGatewayProxyResult> {
  try {
    // Input validation
    const userValidation = validateUserId(userId);
    if (!userValidation.isValid) {
      throw new ValidationError(userValidation.error!);
    }

    // Service layer handles business logic
    const result = await agentService.listFavoriteAgents(
      userId,
      limit,
      exclusiveStartKey
    );
    return createSuccessResponse(result);
  } catch (error) {
    return handleError(error as Error);
  }
}

/**
 * Handle toggle agent favorite request
 */
export async function handleToggleAgentFavorite(
  userId: string,
  agentId: string
): Promise<APIGatewayProxyResult> {
  try {
    // Input validation
    const userValidation = validateUserId(userId);
    if (!userValidation.isValid) {
      throw new ValidationError(userValidation.error!);
    }

    const agentValidation = validateAgentId(agentId);
    if (!agentValidation.isValid) {
      throw new ValidationError(agentValidation.error!);
    }

    // Service layer handles business logic
    const result = await agentService.toggleAgentFavorite(userId, agentId);
    return createSuccessResponse(result);
  } catch (error) {
    return handleError(error as Error);
  }
}
