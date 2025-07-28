import { useState, useEffect } from "react";
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
}

export default function Marketplace({ account, onRefresh }: { account: string | null; onRefresh?: () => void }) {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"price-low" | "price-high" | "newest">("newest");
  const [filterPrice, setFilterPrice] = useState<string>("");

  const fetchMarketItems = async () => {
    setLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL);
      const contract = getContract(provider);
      const marketItems = await contract.fetchMarketItems();
      
      const formattedItems = marketItems.map((item: any) => ({
        tokenId: item.tokenId.toString(),
        seller: item.seller,
        owner: item.owner,
        price: ethers.formatEther(item.price),
        sold: item.sold,
        listed: item.listed,
      }));

      setItems(formattedItems);
    } catch (e) {
      console.error("Error fetching market items:", e);
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMarketItems();
  }, []);

  // Filter and sort items
  const filteredAndSortedItems = items
    .filter(item => {
      if (!filterPrice) return true;
      return parseFloat(item.price) <= parseFloat(filterPrice);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return parseFloat(a.price) - parseFloat(b.price);
        case "price-high":
          return parseFloat(b.price) - parseFloat(a.price);
        case "newest":
        default:
          return parseInt(b.tokenId) - parseInt(a.tokenId);
      }
    });

  const handleAction = () => {
    fetchMarketItems();
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Price (ETH)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Any price"
              value={filterPrice}
              onChange={(e) => setFilterPrice(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-32"
            />
          </div>
        </div>

        <div className="text-sm text-gray-500">
          {filteredAndSortedItems.length} NFT{filteredAndSortedItems.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* NFT Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading marketplace...</p>
        </div>
      ) : filteredAndSortedItems.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No NFTs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {items.length === 0 ? "No NFTs are currently listed for sale." : "No NFTs match your filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedItems.map((item) => (
            <NFTCard
              key={item.tokenId}
              {...item}
              account={account}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
