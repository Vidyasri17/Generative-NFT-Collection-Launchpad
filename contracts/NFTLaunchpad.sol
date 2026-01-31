// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title NFTLaunchpad
 * @dev A feature-rich ERC-721 NFT contract with allowlist, public minting, and reveal mechanism
 */
contract NFTLaunchpad is ERC721, ERC2981, Ownable, Pausable {
    // ============ State Variables ============
    
    uint256 public totalSupply;
    uint256 public nextTokenId = 1;
    
    // Sale Configuration
    uint256 public allowlistPrice;
    uint256 public publicPrice;
    uint256 public maxSupply;
    uint256 public maxMintsPerTransaction = 10;
    
    // Merkle Root for allowlist verification
    bytes32 public merkleRoot;
    
    // URI Configuration
    string public baseURI;
    string public unrevealedURI;
    bool public revealed;
    
    // Sale Phases
    enum SalePhase { CLOSED, ALLOWLIST, PUBLIC }
    SalePhase public currentPhase = SalePhase.CLOSED;
    
    // Tracking allowlist mints
    mapping(address => uint256) public allowlistMintedCount;
    mapping(address => bool) public allowlistClaimed;
    
    // Royalty Configuration
    address public royaltyRecipient;
    uint96 public royaltyPercentage;
    
    // ============ Events ============
    
    event AllowlistMint(address indexed to, uint256 indexed tokenId, uint256 quantity);
    event PublicMint(address indexed to, uint256 indexed tokenId, uint256 quantity);
    event PhaseChanged(SalePhase newPhase);
    event MerkleRootUpdated(bytes32 newRoot);
    event URIUpdated(string newBaseURI);
    event Revealed();
    event Withdrawal(uint256 amount);
    
    // ============ Errors ============
    
    error InvalidPhase();
    error InvalidMerkleProof();
    error AllowlistAlreadyClaimed();
    error ExceedsMaxSupply();
    error ExceedsMaxMintsPerTx();
    error InsufficientPayment();
    error ZeroAddress();
    error ContractPaused();
    error SaleNotStarted();
    
    // ============ Constructor ============
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply,
        uint256 _allowlistPrice,
        uint256 _publicPrice,
        string memory _unrevealedURI,
        address _royaltyRecipient,
        uint96 _royaltyPercentage
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        maxSupply = _maxSupply;
        allowlistPrice = _allowlistPrice;
        publicPrice = _publicPrice;
        unrevealedURI = _unrevealedURI;
        royaltyRecipient = _royaltyRecipient;
        royaltyPercentage = _royaltyPercentage;
        
        // Set default royalty
        _setDefaultRoyalty(_royaltyRecipient, _royaltyPercentage);
    }
    
    // ============ Minting Functions ============
    
    /**
     * @dev Mint NFTs from the allowlist phase using Merkle proof
     * @param merkleProof The Merkle proof for verification
     * @param quantity The number of NFTs to mint
     */
    function allowlistMint(bytes32[] calldata merkleProof, uint256 quantity)
        external
        payable
        whenNotPaused
    {
        if (currentPhase != SalePhase.ALLOWLIST) revert InvalidPhase();
        if (allowlistClaimed[msg.sender]) revert AllowlistAlreadyClaimed();
        if (nextTokenId + quantity - 1 > maxSupply) revert ExceedsMaxSupply();
        if (quantity > maxMintsPerTransaction) revert ExceedsMaxMintsPerTx();
        if (msg.value < allowlistPrice * quantity) revert InsufficientPayment();
        
        // Verify Merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verify(merkleProof, merkleRoot, leaf)) {
            revert InvalidMerkleProof();
        }
        
        allowlistClaimed[msg.sender] = true;
        allowlistMintedCount[msg.sender] = quantity;
        
        // Mint tokens
        for (uint256 i = 0; i < quantity; i++) {
            _safeMint(msg.sender, nextTokenId++);
        }
        
        totalSupply += quantity;
        emit AllowlistMint(msg.sender, nextTokenId - quantity, quantity);
    }
    
    /**
     * @dev Mint NFTs during the public sale phase
     * @param quantity The number of NFTs to mint
     */
    function publicMint(uint256 quantity)
        external
        payable
        whenNotPaused
    {
        if (currentPhase != SalePhase.PUBLIC) revert InvalidPhase();
        if (nextTokenId + quantity - 1 > maxSupply) revert ExceedsMaxSupply();
        if (quantity > maxMintsPerTransaction) revert ExceedsMaxMintsPerTx();
        if (msg.value < publicPrice * quantity) revert InsufficientPayment();
        
        // Mint tokens
        for (uint256 i = 0; i < quantity; i++) {
            _safeMint(msg.sender, nextTokenId++);
        }
        
        totalSupply += quantity;
        emit PublicMint(msg.sender, nextTokenId - quantity, quantity);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Set the current sale phase
     * @param _phase The new sale phase
     */
    function setPhase(SalePhase _phase) external onlyOwner {
        currentPhase = _phase;
        emit PhaseChanged(_phase);
    }
    
    /**
     * @dev Set the Merkle root for allowlist verification
     * @param _merkleRoot The new Merkle root
     */
    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_merkleRoot);
    }
    
    /**
     * @dev Set the base URI for token metadata
     * @param _baseURI The new base URI
     */
    function setBaseURI(string calldata _baseURI) external onlyOwner {
        baseURI = _baseURI;
        emit URIUpdated(_baseURI);
    }
    
    /**
     * @dev Reveal the collection by enabling the base URI
     */
    function revealCollection() external onlyOwner {
        revealed = true;
        emit Revealed();
    }
    
    /**
     * @dev Set the unrevealed URI for all tokens
     * @param _unrevealedURI The new unrevealed URI
     */
    function setUnrevealedURI(string calldata _unrevealedURI) external onlyOwner {
        unrevealedURI = _unrevealedURI;
    }
    
    /**
     * @dev Update allowlist price
     * @param _price The new allowlist price in wei
     */
    function setAllowlistPrice(uint256 _price) external onlyOwner {
        allowlistPrice = _price;
    }
    
    /**
     * @dev Update public sale price
     * @param _price The new public sale price in wei
     */
    function setPublicPrice(uint256 _price) external onlyOwner {
        publicPrice = _price;
    }
    
    
    function setMaxSupply(uint256 _maxSupply) external onlyOwner {
        require(_maxSupply > totalSupply, "Max supply must be greater than current supply");
        maxSupply = _maxSupply;
    }

    function setMaxMintsPerTransaction(uint256 _maxMintsPerTransaction) external onlyOwner {
        maxMintsPerTransaction = _maxMintsPerTransaction;
    }
    
    /**
     * @dev Pause/unpause minting
     */
    function setPaused(bool _paused) external onlyOwner {
        if (_paused) {
            _pause();
        } else {
            _unpause();
        }
    }
    
    /**
     * @dev Withdraw contract balance to owner
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert InsufficientPayment();
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit Withdrawal(balance);
    }
    
    /**
     * @dev Set royalty information
     * @param _receiver The royalty receiver address
     * @param _percentage The royalty percentage (e.g., 500 for 5%)
     */
    function setRoyalty(address _receiver, uint96 _percentage) external onlyOwner {
        if (_receiver == address(0)) revert ZeroAddress();
        royaltyRecipient = _receiver;
        royaltyPercentage = _percentage;
        _setDefaultRoyalty(_receiver, _percentage);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get the token URI for metadata
     * @param tokenId The token ID
     * @return The token URI
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_exists(tokenId), "Token does not exist");
        
        if (!revealed) {
            return unrevealedURI;
        }
        
        return string(abi.encodePacked(baseURI, "/", _toString(tokenId), ".json"));
    }
    
    /**
     * @dev Check if an address is allowlisted
     * @param account The account address
     * @param merkleProof The Merkle proof for verification
     * @return Whether the address is allowlisted
     */
    function isAllowlisted(address account, bytes32[] calldata merkleProof)
        public
        view
        returns (bool)
    {
        bytes32 leaf = keccak256(abi.encodePacked(account));
        return MerkleProof.verify(merkleProof, merkleRoot, leaf);
    }
    
    /**
     * @dev Get the current sale phase name
     * @return The current phase name
     */
    function getCurrentPhaseName() external view returns (string memory) {
        if (currentPhase == SalePhase.ALLOWLIST) return "ALLOWLIST";
        if (currentPhase == SalePhase.PUBLIC) return "PUBLIC";
        return "CLOSED";
    }
    
    /**
     * @dev Get contract details
     */
    function getContractDetails()
        external
        view
        returns (
            uint256 _maxSupply,
            uint256 _totalSupply,
            uint256 _allowlistPrice,
            uint256 _publicPrice,
            bool _revealed,
            uint256 _nextTokenId
        )
    {
        return (
            maxSupply,
            totalSupply,
            allowlistPrice,
            publicPrice,
            revealed,
            nextTokenId
        );
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Check if a token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenId > 0 && tokenId < nextTokenId;
    }
    
    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    // ============ Override Functions ============
    
    /**
     * @dev Required override for supportsInterface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
