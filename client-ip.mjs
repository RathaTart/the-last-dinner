import {isIP} from 'node:net';
// The Lambda URL accepts only this distribution's OAC-signed requests.
// CloudFront appends the actual viewer to X-Forwarded-For; earlier entries
// can be supplied by a viewer and must not be trusted for quota accounting.
export function viewerIp(headers,sourceIp='unknown'){
 const candidate=String(headers['x-forwarded-for']||'').split(',').at(-1).trim();
 return isIP(candidate)?candidate:sourceIp;
}
