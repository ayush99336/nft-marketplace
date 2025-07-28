import { ethers, Signer, Provider } from "ethers";
import NFTMarketplaceABI from "./NFTMarketplaceABI.json";

const CONTRACT_ADDRESS = "0xaa96B9B2eBe0189e96384f1ad5F6324eD45C616a";

export function getContract(signerOrProvider: Signer | Provider) {
  return new ethers.Contract(CONTRACT_ADDRESS, NFTMarketplaceABI, signerOrProvider);
}
