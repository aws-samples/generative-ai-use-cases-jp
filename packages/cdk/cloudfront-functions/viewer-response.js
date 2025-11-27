/**
 * CloudFront Function: ViewerResponse
 * Purpose: Set 503 status code for maintenance page responses to indicate service unavailability.
 * Runtime: JavaScript 2.0
 */

import cf from 'cloudfront';

// This fails if there is no key value store associated with the function
const kvsHandle = cf.kvs();

async function handler(event) {
  const response = event.response;
  const request = event.request;

  try {
    // Check if this is a response for maintenance page
    const uri = request.uri;
    console.log(
      'viewer-response URI: ' + uri + ' Status: ' + response.statusCode
    );

    if (uri === '/maintenance.html') {
      // Only set 503 if maintenance mode is actually active
      const maintenance = await kvsHandle.get('maintenance');
      console.log('viewer-response: Maintenance mode = ' + maintenance);

      // Check for both string 'true' and boolean true for robustness
      if (maintenance === 'true' || maintenance === true) {
        console.log('viewer-response: Setting 503 status');
        // Set 503 Service Unavailable status
        response.statusCode = 503;
        response.statusDescription = 'Service Unavailable';

        // Add Retry-After header (3600 seconds = 1 hour)
        if (!response.headers) {
          response.headers = {};
        }
        response.headers['retry-after'] = { value: '3600' };
      } else {
        console.log(
          'viewer-response: Maintenance OFF, keeping original status'
        );
      }
    }
  } catch (error) {
    // Fail open: if any error occurs, return response as-is
    console.log(
      'Error in maintenance mode response function:' + (error.message || error)
    );
  }

  return response;
}
