import { useState } from "react";
import { ethers } from "ethers";
import Image from "next/image";
import { getContract } from "../../utils/contract";

interface NFTCardProps {
  tokenId: string;
  seller: string;
  owner: string;
  price: string;
  sold: boolean;
  listed: boolean;
  tokenURI?: string;
  account?: string | null;
  onAction?: () => void;
  showActions?: boolean;
}

export default function NFTCard({
  tokenId,
  seller,
  owner,
  price,
  sold,
  listed,
  tokenURI,
  account,
  onAction,
  showActions = true
}: NFTCardProps) {
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showRelistModal, setShowRelistModal] = useState(false);
  const [relistPrice, setRelistPrice] = useState("");

  // Fetch metadata when tokenURI is available
  useState(() => {
    if (tokenURI && !metadata) {
      fetch(tokenURI)
        .then(res => res.json())
        .then(data => setMetadata(data))
        .catch(() => {});
    }
  });

  const buyNFT = async () => {
    if (!account) return alert("Connect wallet first");
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = getContract(signer);
      const tx = await contract.createMarketSale(tokenId, { value: ethers.parseEther(price) });
      await tx.wait();
      alert("NFT purchased successfully!");
      if (onAction) onAction();
    } catch (e: any) {
      console.error("Buy NFT error:", e);
      alert("Purchase failed: " + (e?.reason || e?.message || e));
    }
    setLoading(false);
  };

  const delistNFT = async () => {
    if (!account) return alert("Connect wallet first");
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = getContract(signer);
      const tx = await contract.delistMarketItem(tokenId);
      await tx.wait();
      alert("NFT delisted successfully!");
      if (onAction) onAction();
    } catch (e: any) {
      console.error("Delist NFT error:", e);
      alert("Delist failed: " + (e?.reason || e?.message || e));
    }
    setLoading(false);
  };

  const relistNFT = async () => {
    if (!account || !relistPrice) return alert("Please enter a price");
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = getContract(signer);
      const listingPrice = await contract.getListingPrice();
      const tx = await contract.listMarketItem(tokenId, ethers.parseEther(relistPrice), { value: listingPrice });
      await tx.wait();
      alert("NFT relisted successfully!");
      setShowRelistModal(false);
      setRelistPrice("");
      if (onAction) onAction();
    } catch (e: any) {
      console.error("Relist NFT error:", e);
      alert("Relist failed: " + (e?.reason || e?.message || e));
    }
    setLoading(false);
  };

  const isOwner = account?.toLowerCase() === owner.toLowerCase();
  const isSeller = account?.toLowerCase() === seller.toLowerCase();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* NFT Image */}
      <div className="relative w-full h-64 bg-gray-200">
        {metadata?.image ? (
          <Image
            src={metadata.image}
            alt={metadata.name || `NFT #${tokenId}`}
            fill
            style={{ objectFit: "cover" }}
            onLoad={() => setImageLoaded(true)}
            className={`transition-opacity ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          {sold && listed ? (
            <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">Sold</span>
          ) : listed ? (
            <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">Listed</span>
          ) : (
            <span className="bg-gray-500 text-white px-2 py-1 rounded text-xs">Owned</span>
          )}
        </div>
      </div>

      {/* NFT Details */}
      <div className="p-4">
        <h3 className="font-bold text-lg mb-2">
          {metadata?.name || `NFT #${tokenId}`}
        </h3>
        
        {metadata?.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {metadata.description}
          </p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Token ID:</span>
            <span className="font-medium">#{tokenId}</span>
          </div>
          
          {listed && (
            <div className="flex justify-between">
              <span className="text-gray-500">Price:</span>
              <span className="font-bold text-green-600">{price} ETH</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-gray-500">Owner:</span>
            <span className="font-mono text-xs">
              {owner.slice(0, 6)}...{owner.slice(-4)}
            </span>
          </div>
          
          {listed && (
            <div className="flex justify-between">
              <span className="text-gray-500">Seller:</span>
              <span className="font-mono text-xs">
                {seller.slice(0, 6)}...{seller.slice(-4)}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="mt-4 space-y-2">
            {listed && !sold && !isSeller && (
              <button
                onClick={buyNFT}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : `Buy for ${price} ETH`}
              </button>
            )}
            
            {listed && !sold && isSeller && (
              <button
                onClick={delistNFT}
                disabled={loading}
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Delist NFT"}
              </button>
            )}
            
            {sold && listed && (
              <div className="w-full px-4 py-2 bg-gray-300 text-gray-600 rounded text-center">
                Sold
              </div>
            )}
            
            {!listed && isOwner && (
              <button
                onClick={() => setShowRelistModal(true)}
                disabled={loading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                List for Sale
              </button>
            )}
          </div>
        )}

        {/* Relist Modal */}
        {showRelistModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">List NFT for Sale</h3>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Price in ETH"
                value={relistPrice}
                onChange={(e) => setRelistPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              />
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowRelistModal(false);
                    setRelistPrice("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={relistNFT}
                  disabled={!relistPrice || loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Listing..." : "List NFT"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
