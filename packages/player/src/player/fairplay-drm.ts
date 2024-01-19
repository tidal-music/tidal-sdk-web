// Certificate loading logic:
export async function loadServerCertificate() {
  try {
    const response = await fetch(
      'https://resources.tidal.com/drm/fairplay/certificate',
    );
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (err) {
    throw console.error('Failed to retrieve the server certificate.', err);
  }
}
