/**
 * CloudFront Function: ViewerRequest
 * Purpose: Intercept requests and redirect to maintenance page when maintenance mode is active,
 *          unless the client IP is whitelisted.
 * Runtime: JavaScript 2.0
 */

import cf from 'cloudfront';

// This fails if there is no key value store associated with the function
const kvsHandle = cf.kvs();

async function handler(event) {
  const request = event.request;
  const clientIp = event.viewer.ip;

  try {
    // Read maintenance mode state and IP whitelist from KeyValueStore
    const maintenance = await kvsHandle.get('maintenance');
    const ipWhitelist = await kvsHandle.get('ipWhitelist');

    // Debug logging
    console.log(
      'Maintenance mode: ' + maintenance + ' (type: ' + typeof maintenance + ')'
    );
    console.log('Client IP: ' + clientIp);
    console.log('Request URI: ' + request.uri);

    // If maintenance mode is not active, allow request to proceed normally
    // Check for both string 'true' and boolean true for robustness
    if (maintenance !== 'true' && maintenance !== true) {
      console.log('Maintenance mode is OFF - allowing request');
      return request;
    }

    console.log('Maintenance mode is ON - checking whitelist');

    // Parse IP whitelist (comma-separated IPs)
    const whitelistedIps = ipWhitelist
      ? ipWhitelist.split(',').map(function (ip) {
          return ip.trim();
        })
      : [];

    // Check if client IP is whitelisted (exact string match for IPv4/IPv6)
    let isWhitelisted = false;
    for (let i = 0; i < whitelistedIps.length; i++) {
      if (whitelistedIps[i] === clientIp) {
        isWhitelisted = true;
        break;
      }
    }

    console.log(
      'Is whitelisted: ' + isWhitelisted + ' (whitelist: ' + ipWhitelist + ')'
    );

    // Allow whitelisted IPs to proceed normally
    if (isWhitelisted) {
      console.log('IP is whitelisted - allowing request');
      return request;
    }

    // Prevent redirect loop: allow requests for maintenance assets
    const uri = request.uri;
    if (uri === '/maintenance.html' || uri === '/maintenance.css') {
      console.log('Request is for maintenance assets - allowing');
      return request;
    }

    // Redirect non-whitelisted clients to maintenance page
    console.log('Redirecting to maintenance page');
    return {
      statusCode: 302,
      statusDescription: 'Found',
      headers: {
        location: { value: '/maintenance.html' },
      },
    };
  } catch (error) {
    // Fail open: if any error occurs (e.g., KVS access failure), allow request through
    // This prevents CloudFront Function errors from breaking the entire site
    console.log(
      'Error in maintenance mode function:' + (error.message || error)
    );
    return request;
  }
}
