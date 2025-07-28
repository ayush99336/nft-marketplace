import { useState } from "react";
import { ethers } from "ethers";
import Image from "next/image";
import { getContract } from "../../utils/contract";

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
}

export default function MintNFT({ wallet, onMinted }: { wallet: string | null; onMinted?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [minting, setMinting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageIpfsUrl, setImageIpfsUrl] = useState<string | null>(null);
  const [metadataIpfsUrl, setMetadataIpfsUrl] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const uploadImageToIPFS = async () => {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/files", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(data.error || "Upload failed");
    return data;
  };

  const uploadMetadataToIPFS = async (metadata: NFTMetadata) => {
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    const metadataFile = new File([metadataBlob], "metadata.json", { type: "application/json" });
    const formData = new FormData();
    formData.append("file", metadataFile);
    const res = await fetch("/api/files", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(data.error || "Metadata upload failed");
    return data;
  };

  const handleMint = async () => {
    if (!wallet || !file || !name.trim() || !price.trim()) {
      alert("Please connect wallet, select a file, enter a name and price");
      return;
    }
    setMinting(true);
    setUploading(true);
    try {
      // 1. Upload image to IPFS
      const imageUrl = await uploadImageToIPFS();
      setImageIpfsUrl(imageUrl);
      // 2. Upload metadata to IPFS
      const metadata: NFTMetadata = {
        name: name.trim(),
        description: description.trim() || "NFT created with Pinata and Ethereum",
        image: imageUrl,
      };
      const metadataUrl = await uploadMetadataToIPFS(metadata);
      setMetadataIpfsUrl(metadataUrl);
      setUploading(false);
      // 3. Mint NFT using your contract
      // @ts-expect-error
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getContract(signer);
      const listingPrice = await contract.getListingPrice();
      const tx = await contract.createToken(metadataUrl, ethers.parseEther(price), { value: listingPrice });
      setTxHash(tx.hash);
      await tx.wait();
      alert("NFT minted and listed successfully!");
      setFile(null); setPreview(null); setName(""); setDescription(""); setPrice("");
      if (onMinted) onMinted();
    } catch (error) {
      alert(`Mint failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setMinting(false);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Upload Image</label>
        <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
      </div>
      {preview && (
        <div className="border rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
          <div className="relative w-48 h-48 mx-auto">
            <Image src={preview} alt="Preview" fill style={{ objectFit: "cover" }} className="rounded-lg" />
          </div>
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">NFT Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter NFT name" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Enter NFT description (optional)" rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Price (ETH) *</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Enter price in ETH" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" step="0.01" />
        </div>
      </div>
      <button onClick={handleMint} disabled={!file || !wallet || !name.trim() || !price.trim() || minting} className="w-full py-3 text-lg bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60">
        {minting ? (uploading ? "Uploading to IPFS..." : "Minting NFT...") : "Mint & List NFT"}
      </button>
      {(imageIpfsUrl || metadataIpfsUrl || txHash) && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-gray-800">Minting Progress:</h4>
          {imageIpfsUrl && (
            <div className="text-sm"><span className="text-green-600">✓</span> Image uploaded to IPFS: <a href={imageIpfsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1 break-all">{imageIpfsUrl}</a></div>
          )}
          {metadataIpfsUrl && (
            <div className="text-sm"><span className="text-green-600">✓</span> Metadata uploaded to IPFS: <a href={metadataIpfsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1 break-all">{metadataIpfsUrl}</a></div>
          )}
          {txHash && (
            <div className="text-sm"><span className="text-green-600">✓</span> Transaction hash: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1 break-all">{txHash}</a></div>
          )}
        </div>
      )}
    </div>
  );
}
