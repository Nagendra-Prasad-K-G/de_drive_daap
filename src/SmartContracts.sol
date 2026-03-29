// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * @title IPFSRegistry
 * @author PCL_Prototype_Dev
 * @notice A decentralized registry mapping user wallet addresses to IPFS hashes.
 * @dev Implements gas-optimized storage and event logging.
 */
contract IPFSRegistry {
    
    // --- State Variables ---
    
    /// @dev Internal mapping to store the latest IPFS hash for each user.
    /// @custom:security-note Access is public via uploadFile, but restricted to msg.sender scope.
    mapping(address => string) private _userFiles;

    // --- Events ---
    
    /// @dev Emitted when a user updates their file hash. 
    /// Note: Block timestamp is available in the block header, so we omit it here to save gas.
    event FileUploaded(address indexed user, string ipfsHash);

    // --- Functions ---

    /**
     * @notice Link a new IPFS hash to the sender's wallet.
     * @dev Updates the mapping for msg.sender. Includes equality checks to save gas.
     * @param _ipfsHash The Content ID (CID) returned from Pinata.
     */
    function uploadFile(string calldata _ipfsHash) public {
        // Gas Fix: Use != 0 for cheaper comparison
        require(bytes(_ipfsHash).length != 0, "Hash cannot be empty");

        // Gas Fix: Avoid re-writing if the value is the same (Saves ~2000 Gas)
        string memory currentHash = _userFiles[msg.sender];
        
        // Compare hashes (keccak256 is required to compare strings in Solidity)
        if (keccak256(bytes(currentHash)) != keccak256(bytes(_ipfsHash))) {
            _userFiles[msg.sender] = _ipfsHash;
            emit FileUploaded(msg.sender, _ipfsHash);
        }
    }

    /**
     * @notice Retrieve the file hash associated with a specific user.
     * @dev Read-only function.
     * @param _user The address of the user to lookup.
     * @return The IPFS hash string.
     */
    function getFile(address _user) public view returns (string memory) {
        return _userFiles[_user];
    }
}