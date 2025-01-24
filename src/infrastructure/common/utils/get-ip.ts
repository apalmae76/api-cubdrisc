/* eslint-disable @typescript-eslint/no-explicit-any */
export function getIP(headers: any, remoteAddress: string): string {
  let ip: string = headers['cf-connecting-ip'];
  if (!ip) {
    ip = headers['x-real-ip'];
  }
  if (!ip) {
    const ipAddr = headers['x-forwarded-for'];
    if (ipAddr) {
      const list = ipAddr.split(',');
      ip = list[list.length - 1];
    } else {
      ip = remoteAddress;
    }
    ip = ip.replace('::ffff:', '');
  }
  return ip && ip.length > 0 ? ip : 'unknown';
}
