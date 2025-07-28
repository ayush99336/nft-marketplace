import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContract } from "../../utils/contract";
import NFTCard from "./NFTCard";

interface AllNFTsData {
  tokenId: string;
  owner: string;
  tokenURI: string;
  marketData?: {
    seller: string;
    price: string;
    sold: boolean;
    listed: boolean;
  };
}

export default function AllNFTs({ account }: { account: string | null }) {
  const [allNFTs, setAllNFTs] = useState<AllNFTsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalSold, setTotalSold] = useState(0);

  const fetchAllNFTs = async () => {
    setLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL);
      const contract = getContract(provider);
      
      // Get total number of tokens minted
      const total = await contract.getTotalTokens();
      const sold = await contract.getTotalTokensSold();
      setTotalTokens(parseInt(total.toString()));
      setTotalSold(parseInt(sold.toString()));

      const allNFTsData: AllNFTsData[] = [];

      // Fetch each NFT's data
      for (let i = 1; i <= parseInt(total.toString()); i++) {
        try {
          // Get basic NFT data
          const owner = await contract.ownerOf(i);
          const tokenURI = await contract.tokenURI(i);
          
          // Get market data if available
          const marketItem = await contract.fetchMarketItem(i);
          
          allNFTsData.push({
            tokenId: i.toString(),
            owner,
            tokenURI,
            marketData: marketItem ? {
              seller: marketItem.seller,
              price: ethers.formatEther(marketItem.price),
              sold: marketItem.sold,
              listed: marketItem.listed,
            } : undefined,
          });
        } catch (error) {
          // Token might not exist or be burned
          console.warn(`Error fetching NFT #${i}:`, error);
        }
      }

      setAllNFTs(allNFTsData);
    } catch (e) {
      console.error("Error fetching all NFTs:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllNFTs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Total NFTs</h3>
          <p className="text-3xl font-bold text-blue-600">{totalTokens}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Total Sold</h3>
          <p className="text-3xl font-bold text-green-600">{totalSold}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Available</h3>
          <p className="text-3xl font-bold text-purple-600">{totalTokens - totalSold}</p>
        </div>
      </div>

      {/* All NFTs */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">All NFTs</h2>
          <p className="text-sm text-gray-500">Browse all minted NFTs on the platform</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Loading all NFTs...</p>
          </div>
        ) : allNFTs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No NFTs found</h3>
            <p className="mt-1 text-sm text-gray-500">No NFTs have been minted yet.</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {allNFTs.map((nft) => (
                <NFTCard
                  key={nft.tokenId}
                  tokenId={nft.tokenId}
                  seller={nft.marketData?.seller || nft.owner}
                  owner={nft.owner}
                  price={nft.marketData?.price || "0"}
                  sold={nft.marketData?.sold || false}
                  listed={nft.marketData?.listed || false}
                  tokenURI={nft.tokenURI}
                  account={account}
                  onAction={fetchAllNFTs}
                  showActions={nft.marketData?.listed || false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
