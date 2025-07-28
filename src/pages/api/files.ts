import type { NextApiRequest, NextApiResponse } from 'next';
import { formidable, Fields, Files } from 'formidable';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const form = formidable();
  form.parse(req, async (
    err: Error | null, 
    fields: Fields, 
    files: Files
  ) => {
    if (err) return res.status(500).json({ error: 'Form parse error' });

    // Support both single and array file upload, but only one image per NFT
    const fileArray = files.file;
    if (!fileArray) return res.status(400).json({ error: 'No file uploaded' });
    
    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
    const data = new FormData();
    data.append('file', fs.createReadStream(file.filepath), file.originalFilename || 'file');

    try {
      const pinataRes = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        data,
        {
          maxBodyLength: Infinity,
          headers: {
            ...data.getHeaders(),
            pinata_api_key: process.env.PINATA_API_KEY!,
            pinata_secret_api_key: process.env.PINATA_API_SECRET!,
          },
        }
      );
      const url = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${pinataRes.data.IpfsHash}`;
      res.status(200).json(url);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Pinata upload failed';
      res.status(500).json({ error: errorMessage });
    }
  });
}
