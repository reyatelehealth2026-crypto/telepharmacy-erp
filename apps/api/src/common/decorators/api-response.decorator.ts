import { SetMetadata } from '@nestjs/common';

export const API_RESPONSE_MESSAGE = 'api_response_message';

/**
 * Attach a custom success message to the response envelope.
 * Usage: @ApiResponseMessage('User created successfully')
 */
export const ApiResponseMessage = (message: string) =>
  SetMetadata(API_RESPONSE_MESSAGE, message);
