// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IIdentityVerifier {
    function isVerified(address user) external view returns (bool);
}

contract KYCGatedAuction {

    IIdentityVerifier public identityContract;

    address public owner;
    uint256 public highestBid;
    address public highestBidder;

    bool public auctionActive;

    event BidPlaced(address indexed bidder, uint256 amount);
    event AuctionStarted();
    event AuctionEnded(address winner, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _identityContract) {
        identityContract = IIdentityVerifier(_identityContract);
        owner = msg.sender;
    }

    // 🚀 Start auction
    function startAuction() external onlyOwner {
        require(!auctionActive, "Auction is already active");
        highestBid = 0;
        highestBidder = address(0);
        auctionActive = true;
        emit AuctionStarted();
    }

    // 🛑 End auction
    function endAuction() external onlyOwner {
        auctionActive = false;
        emit AuctionEnded(highestBidder, highestBid);
    }

    // 💰 Place bid (KYC REQUIRED 🔥)
    function placeBid() external payable {
        require(auctionActive, "Auction not active");

        // 🔥 COMPOSABILITY CHECK
        require(
            identityContract.isVerified(msg.sender),
            "KYC required"
        );

        require(msg.value > highestBid, "Bid too low");

        highestBid = msg.value;
        highestBidder = msg.sender;

        emit BidPlaced(msg.sender, msg.value);
    }
}
