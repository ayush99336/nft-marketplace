// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NFTMarketplace is ERC721URIStorage, ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;
    
    uint256 listingPrice = 0.025 ether;
    
    struct MarketItem {
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
        bool listed;
    }
    
    mapping(uint256 => MarketItem) private idToMarketItem;
    
    event MarketItemCreated(
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        bool sold
    );
    
    event MarketItemSold(
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price
    );
    
    event MarketItemListed(
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );
    
    event MarketItemDelisted(
        uint256 indexed tokenId,
        address seller
    );
    
    constructor() ERC721("NFT Marketplace", "NFTM") Ownable(msg.sender) {}
    
    /**
     * @dev Updates the listing price of the contract
     * @param _listingPrice New listing price in wei
     */
    function updateListingPrice(uint256 _listingPrice) public onlyOwner {
        listingPrice = _listingPrice;
    }
    
    /**
     * @dev Returns the listing price of the contract
     */
    function getListingPrice() public view returns (uint256) {
        return listingPrice;
    }
    
    /**
     * @dev Mints a token and lists it in the marketplace
     * @param tokenURI Metadata URI for the token
     * @param price Price to list the token for
     */
    function createToken(string memory tokenURI, uint256 price) public payable returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        createMarketItem(newTokenId, price);
        
        return newTokenId;
    }
    
    /**
     * @dev Creates a market item for an existing token
     * @param tokenId Token ID to list
     * @param price Price to list the token for
     */
    function createMarketItem(uint256 tokenId, uint256 price) private {
        require(price > 0, "Price must be at least 1 wei");
        require(msg.value == listingPrice, "Price must be equal to listing price");
        
        idToMarketItem[tokenId] = MarketItem(
            tokenId,
            payable(msg.sender),
            payable(address(this)),
            price,
            false,
            true
        );
        
        _transfer(msg.sender, address(this), tokenId);
        
        emit MarketItemCreated(
            tokenId,
            msg.sender,
            address(this),
            price,
            false
        );
    }
    
    /**
     * @dev Lists an existing token for sale
     * @param tokenId Token ID to list
     * @param price Price to list the token for
     */
    function listMarketItem(uint256 tokenId, uint256 price) public payable nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Only item owner can perform this operation");
        require(price > 0, "Price must be at least 1 wei");
        require(msg.value == listingPrice, "Price must be equal to listing price");
        require(!idToMarketItem[tokenId].listed, "Item is already listed");
        
        idToMarketItem[tokenId] = MarketItem(
            tokenId,
            payable(msg.sender),
            payable(address(this)),
            price,
            false,
            true
        );
        
        _transfer(msg.sender, address(this), tokenId);
        
        emit MarketItemListed(tokenId, msg.sender, price);
    }
    
    /**
     * @dev Removes a market item from sale
     * @param tokenId Token ID to delist
     */
    function delistMarketItem(uint256 tokenId) public nonReentrant {
        require(idToMarketItem[tokenId].seller == msg.sender, "Only seller can delist item");
        require(idToMarketItem[tokenId].listed, "Item is not listed");
        require(!idToMarketItem[tokenId].sold, "Item is already sold");
        
        idToMarketItem[tokenId].listed = false;
        idToMarketItem[tokenId].owner = payable(msg.sender);
        
        _transfer(address(this), msg.sender, tokenId);
        
        emit MarketItemDelisted(tokenId, msg.sender);
    }
    
    /**
     * @dev Creates the sale of a marketplace item
     * @param tokenId Token ID to purchase
     */
    function createMarketSale(uint256 tokenId) public payable nonReentrant {
        uint256 price = idToMarketItem[tokenId].price;
        address seller = idToMarketItem[tokenId].seller;
        
        require(msg.value == price, "Please submit the asking price in order to complete the purchase");
        require(idToMarketItem[tokenId].listed, "Item is not listed for sale");
        require(!idToMarketItem[tokenId].sold, "Item is already sold");
        require(seller != msg.sender, "You cannot buy your own item");
        
        idToMarketItem[tokenId].owner = payable(msg.sender);
        idToMarketItem[tokenId].sold = true;
        idToMarketItem[tokenId].listed = false;
        _itemsSold.increment();
        
        _transfer(address(this), msg.sender, tokenId);
        payable(owner()).transfer(listingPrice);
        payable(seller).transfer(msg.value);
        
        emit MarketItemSold(tokenId, seller, msg.sender, price);
    }
    
    /**
     * @dev Updates the price of a listed market item
     * @param tokenId Token ID to update
     * @param newPrice New price for the token
     */
    function updateMarketItemPrice(uint256 tokenId, uint256 newPrice) public {
        require(idToMarketItem[tokenId].seller == msg.sender, "Only seller can update price");
        require(idToMarketItem[tokenId].listed, "Item is not listed");
        require(!idToMarketItem[tokenId].sold, "Item is already sold");
        require(newPrice > 0, "Price must be at least 1 wei");
        
        idToMarketItem[tokenId].price = newPrice;
    }
    
    /**
     * @dev Returns all unsold market items
     */
    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 itemCount = _tokenIds.current();
        uint256 unsoldItemCount = _tokenIds.current() - _itemsSold.current();
        uint256 currentIndex = 0;
        
        MarketItem[] memory items = new MarketItem[](unsoldItemCount);
        for (uint256 i = 0; i < itemCount; i++) {
            if (idToMarketItem[i + 1].owner == address(this) && idToMarketItem[i + 1].listed) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
    
    /**
     * @dev Returns only items that a user has purchased
     */
    function fetchMyNFTs() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].owner == msg.sender) {
                itemCount += 1;
            }
        }
        
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].owner == msg.sender) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
    
    /**
     * @dev Returns only items a user has listed
     */
    function fetchItemsListed() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender) {
                itemCount += 1;
            }
        }
        
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
    
    /**
     * @dev Returns a specific market item
     * @param tokenId Token ID to fetch
     */
    function fetchMarketItem(uint256 tokenId) public view returns (MarketItem memory) {
        return idToMarketItem[tokenId];
    }
    
    /**
     * @dev Returns the total number of tokens minted
     */
    function getTotalTokens() public view returns (uint256) {
        return _tokenIds.current();
    }
    
    /**
     * @dev Returns the total number of tokens sold
     */
    function getTotalTokensSold() public view returns (uint256) {
        return _itemsSold.current();
    }
    
    /**
     * @dev Withdraw contract balance (only owner)
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Emergency function to transfer stuck tokens (only owner)
     * @param tokenId Token ID to transfer
     * @param to Address to transfer to
     */
    function emergencyTransfer(uint256 tokenId, address to) public onlyOwner {
        require(ownerOf(tokenId) == address(this), "Token not owned by contract");
        _transfer(address(this), to, tokenId);
        
        // Reset market item data
        delete idToMarketItem[tokenId];
    }
}