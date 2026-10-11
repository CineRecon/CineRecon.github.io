const ENCODING = 'motion-delta-shuffle-v1';
const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

/** Restore the version-2 scene payload in place and verify its original hash. */
export async function decodeScenePayload(encoded, scene, manifest, onProgress = () => {}) {
  if (!(encoded instanceof ArrayBuffer)) throw new TypeError('Scene payload must be an ArrayBuffer.');
  if (manifest?.version !== 2 || manifest.encoding !== ENCODING) {
    throw new Error('Unsupported scene payload version or encoding.');
  }
  if (!Number.isSafeInteger(manifest.decoded_bytes) || manifest.decoded_bytes <= 0 ||
      manifest.decoded_bytes !== encoded.byteLength) {
    throw new Error('Scene payload decoded byte length does not match the manifest.');
  }
  if (typeof manifest.decoded_sha256 !== 'string' || !/^[a-f\d]{64}$/i.test(manifest.decoded_sha256)) {
    throw new Error('Scene payload decoded SHA-256 is invalid.');
  }
  if (!Array.isArray(scene?.frames) || scene.frames.length === 0 || !Array.isArray(scene.objects)) {
    throw new Error('Scene animation layout is invalid.');
  }
  if (typeof onProgress !== 'function') throw new TypeError('Scene progress callback must be a function.');
  if (!globalThis.crypto?.subtle) throw new Error('Scene integrity verification requires Web Crypto.');

  // Validate every range before changing any bytes. Positions count individual
  // scalar coordinates, so it is also the number of uint16 values per frame.
  const blocks = [];
  for (const object of scene.objects) {
    if (!object || typeof object !== 'object') throw new Error('Scene object layout is invalid.');
    if (object.motion === undefined) continue;
    const {offset, count} = object.motion || {};
    const stride = object.position?.count;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset % 2 !== 0 ||
        !Number.isSafeInteger(count) || count <= 0 || offset > encoded.byteLength ||
        count > Math.floor((encoded.byteLength - offset) / 2)) {
      throw new Error('Scene motion block bounds are invalid.');
    }
    if (!Number.isSafeInteger(stride) || stride <= 0 || count !== stride * scene.frames.length) {
      throw new Error('Scene motion block count does not match the animation layout.');
    }
    blocks.push({offset, count, stride, end: offset + count * 2});
  }
  blocks.sort((a, b) => a.offset - b.offset);
  for (let i = 1; i < blocks.length; i++) {
    if (blocks[i].offset < blocks[i - 1].end) throw new Error('Scene motion blocks overlap.');
  }

  const output = new DataView(encoded);
  const total = blocks.reduce((sum, block) => sum + block.count, 0);
  let restored = 0;
  onProgress(0);
  await yieldToBrowser();
  for (const {offset, count, stride} of blocks) {
    // Copy the complete shuffled block before writes can overwrite its source.
    const shuffled = new Uint8Array(encoded, offset, count * 2).slice();
    for (let i = 0; i < count; i++) {
      const delta = shuffled[i] | (shuffled[count + i] << 8);
      const previous = i < stride ? 0 : output.getUint16(offset + (i - stride) * 2, true);
      output.setUint16(offset + i * 2, (delta + previous) & 0xffff, true);
    }
    restored += count;
    // Completion is reported only after the full decoded buffer is verified.
    onProgress(Math.min(restored / total, 0.99));
    await yieldToBrowser();
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== manifest.decoded_sha256.toLowerCase()) throw new Error('Decoded scene SHA-256 mismatch.');
  onProgress(1);
  return encoded;
}
