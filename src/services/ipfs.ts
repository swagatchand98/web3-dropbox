import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { CID } from 'multiformats/cid';

let heliaInstance: any = null;

export async function getHelia() {
  if (!heliaInstance) {
    heliaInstance = await createHelia();
  }
  return heliaInstance;
}

export async function uploadToIPFS(file: File): Promise<string> {
  try {
    const helia = await getHelia();
    const fs = unixfs(helia);
    
    const fileBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);
    
    const cid = await fs.addFile({
      path: file.name,
      content: uint8Array,
    });
    
    return cid.toString();
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
}

export async function downloadFromIPFS(cid: string): Promise<Uint8Array> {
  try {
    const helia = await getHelia();
    const fs = unixfs(helia);
    
    // For now, we'll use a simple approach
    const chunks: Uint8Array[] = [];
    for await (const chunk of fs.cat(cid as any)) {
      chunks.push(chunk);
    }
    
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  } catch (error) {
    console.error('Error downloading from IPFS:', error);
    throw error;
  }
}
