import * as fs from 'fs';
import { join } from 'path';

export default function imgToBase64(imgShortPath: string): string {
  const imgPath = join(__dirname, '..', '..', '..', 'assets', imgShortPath);
  return fs.readFileSync(imgPath, { encoding: 'base64' });
}
