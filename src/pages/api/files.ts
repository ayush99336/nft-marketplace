import type { NextApiRequest, NextApiResponse } from 'next';

import { formidable } from 'formidable';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const form = formidable();
  form.parse(req, async (err: any, fields: any, files: any) => {
    if (err) return res.status(500).json({ error: 'Form parse error' });

    // Support both single and array file upload, but only one image per NFT
    let file = files.file;
    if (Array.isArray(file)) file = file[0];
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const data = new FormData();
    // @ts-ignore
    data.append('file', fs.createReadStream(file.filepath), file.originalFilename);

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
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Pinata upload failed' });
    }
  });
}
