import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getContract } from "../../utils/contract";
import NFTCard from "./NFTCard";

interface MarketItem {
  tokenId: string;
  seller: string;
  owner: string;
  price: string;
  sold: boolean;
  listed: boolean;
  tokenURI?: string; // Add tokenURI for metadata fetching
}

export default function MyNFTs({ account }: { account: string | null }) {
  const [myNFTs, setMyNFTs] = useState<MarketItem[]>([]);
  const [listedNFTs, setListedNFTs] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"owned" | "listed">("owned");

  const fetchMyNFTs = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      // Must use wallet provider to get msg.sender context for contract functions
      if (typeof window !== "undefined" && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = getContract(signer);
        
        // Use built-in contract functions that filter by msg.sender
        const ownedItems = await contract.fetchMyNFTs();
        const ownedNFTs = await Promise.all(
          ownedItems.map(async (item: { tokenId: { toString: () => string }; seller: string; owner: string; price: bigint; sold: boolean; listed: boolean }) => {
            const tokenURI = await contract.tokenURI(item.tokenId);
            return {
              tokenId: item.tokenId.toString(),
              seller: item.seller,
              owner: item.owner,
              price: ethers.formatEther(item.price),
              sold: item.sold,
              listed: item.listed,
              tokenURI: tokenURI,
            };
          })
        );
        setMyNFTs(ownedNFTs);

        const listedItems = await contract.fetchItemsListed();
        const listedNFTs = await Promise.all(
          listedItems.map(async (item: { tokenId: { toString: () => string }; seller: string; owner: string; price: bigint; sold: boolean; listed: boolean }) => {
            const tokenURI = await contract.tokenURI(item.tokenId);
            return {
              tokenId: item.tokenId.toString(),
              seller: item.seller,
              owner: item.owner,
              price: ethers.formatEther(item.price),
              sold: item.sold,
              listed: item.listed,
              tokenURI: tokenURI,
            };
          })
        );
        setListedNFTs(listedNFTs);
      } else {
        // Fallback if no wallet available
        setMyNFTs([]);
        setListedNFTs([]);
      }
    } catch (e) {
      console.error("Error fetching NFTs:", e);
      setMyNFTs([]);
      setListedNFTs([]);
    }
    setLoading(false);
  }, [account]);

  useEffect(() => {
    fetchMyNFTs();
  }, [fetchMyNFTs]);

  if (!account) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please connect your wallet to view your NFTs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-4 border-b">
        <button
          onClick={() => setActiveTab("owned")}
          className={`pb-2 px-1 font-medium ${
            activeTab === "owned"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Owned NFTs ({myNFTs.length})
        </button>
        <button
          onClick={() => setActiveTab("listed")}
          className={`pb-2 px-1 font-medium ${
            activeTab === "listed"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Listed NFTs ({listedNFTs.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading your NFTs...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === "owned" ? (
            myNFTs.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">You don&apos;t own any NFTs yet</p>
              </div>
            ) : (
              myNFTs.map((nft) => (
                <NFTCard
                  key={nft.tokenId}
                  {...nft}
                  tokenURI={nft.tokenURI}
                  account={account}
                  onAction={fetchMyNFTs}
                  showActions={true}
                />
              ))
            )
          ) : (
            listedNFTs.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">You haven&apos;t listed any NFTs yet</p>
              </div>
            ) : (
              listedNFTs.map((nft) => (
                <NFTCard
                  key={nft.tokenId}
                  {...nft}
                  tokenURI={nft.tokenURI}
                  account={account}
                  onAction={fetchMyNFTs}
                  showActions={true}
                />
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}
