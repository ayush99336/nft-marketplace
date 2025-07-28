
"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const MintNFT = dynamic(() => import("../components/MintNFT"), { ssr: false });
const Marketplace = dynamic(() => import("../components/Marketplace"), { ssr: false });
const MyNFTs = dynamic(() => import("../components/MyNFTs"), { ssr: false });
const AllNFTs = dynamic(() => import("../components/AllNFTs"), { ssr: false });

type Tab = "marketplace" | "mint" | "my-nfts" | "all-nfts";

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("marketplace");
  const [refreshKey, setRefreshKey] = useState(0);

  // Connect wallet
  async function connectWallet() {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    } else {
      alert("MetaMask not detected. Please install MetaMask to use this application.");
    }
  }

  // Disconnect wallet
  function disconnectWallet() {
    setAccount(null);
  }

  // Handle refresh after minting
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    // Check if wallet is already connected
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
        });

      // Listen for account changes
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0] || null);
      });

      // Listen for network changes
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  const tabs = [
    { id: "marketplace", label: "Marketplace", icon: "🏪" },
    { id: "mint", label: "Mint NFT", icon: "✨" },
    { id: "my-nfts", label: "My NFTs", icon: "👤" },
    { id: "all-nfts", label: "All NFTs", icon: "🖼️" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">🎨 NFT Marketplace</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {account && (
                <div className="text-sm text-gray-600">
                  Connected: {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              )}
              {account ? (
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={connectWallet}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "marketplace" && (
          <Marketplace key={refreshKey} account={account} onRefresh={handleRefresh} />
        )}
        
        {activeTab === "mint" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Mint New NFT</h2>
              <MintNFT 
                wallet={account} 
                onMinted={() => {
                  handleRefresh();
                  setActiveTab("my-nfts");
                }} 
              />
            </div>
          </div>
        )}
        
        {activeTab === "my-nfts" && (
          <MyNFTs account={account} />
        )}
        
        {activeTab === "all-nfts" && (
          <AllNFTs account={account} />
        )}
      </main>
    </div>
  );
}
