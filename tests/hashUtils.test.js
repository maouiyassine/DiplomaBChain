/**
 * @jest-environment node
 */
import { bufferToHex, hashFile } from '../src/utils/hashUtils';

test('bufferToHex returns the correct hex string', () => {
  const buffer = new Uint8Array([0, 15, 255]).buffer;
  expect(bufferToHex(buffer)).toBe('000fff');
});

test('hashFile returns a SHA-256 hash string', async () => {
  const content = 'hello world';
  const file = new File([content], 'hello.txt', { type: 'text/plain' });
  file.arrayBuffer = () => Promise.resolve(new Uint8Array(Buffer.from(content)).buffer);
  const hash = await hashFile(file);
  expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
});
