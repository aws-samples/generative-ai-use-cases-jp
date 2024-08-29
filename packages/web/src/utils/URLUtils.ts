// RFC3986 Encoding
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent#encoding_for_rfc3986
const encodeRFC3986URI = (uri: string) => {
  return encodeURI(uri).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
};

export const cleanEncode = (uri: string): string => {
  // Check if uri is encoded, and encode it if not already encoded
  if (decodeURI(uri) === uri) {
    return encodeRFC3986URI(uri);
  } else {
    return uri;
  }
};
