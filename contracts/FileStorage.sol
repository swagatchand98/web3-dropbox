// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract FileStorage {
    struct FileRecord {
        string ipfsHash;
        string fileName;
        uint256 fileSize;
        address owner;
        uint256 timestamp;
        bool isPublic;
    }
    
    mapping(string => FileRecord) public files;
    mapping(address => string[]) public userFiles;
    
    event FileUploaded(
        string indexed ipfsHash,
        string fileName,
        address indexed owner,
        uint256 timestamp
    );
    
    event FileShared(
        string indexed ipfsHash,
        address indexed owner,
        address indexed sharedWith
    );
    
    function uploadFile(
        string memory _ipfsHash,
        string memory _fileName,
        uint256 _fileSize,
        bool _isPublic
    ) public {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(bytes(_fileName).length > 0, "File name cannot be empty");
        require(files[_ipfsHash].owner == address(0), "File already exists");
        
        files[_ipfsHash] = FileRecord({
            ipfsHash: _ipfsHash,
            fileName: _fileName,
            fileSize: _fileSize,
            owner: msg.sender,
            timestamp: block.timestamp,
            isPublic: _isPublic
        });
        
        userFiles[msg.sender].push(_ipfsHash);
        
        emit FileUploaded(_ipfsHash, _fileName, msg.sender, block.timestamp);
    }
    
    function getFile(string memory _ipfsHash) public view returns (FileRecord memory) {
        require(files[_ipfsHash].owner != address(0), "File does not exist");
        return files[_ipfsHash];
    }
    
    function getUserFiles(address _user) public view returns (string[] memory) {
        return userFiles[_user];
    }
    
    function isFileOwner(string memory _ipfsHash, address _user) public view returns (bool) {
        return files[_ipfsHash].owner == _user;
    }
    
    function makeFilePublic(string memory _ipfsHash) public {
        require(files[_ipfsHash].owner == msg.sender, "Only owner can make file public");
        files[_ipfsHash].isPublic = true;
    }
    
    function makeFilePrivate(string memory _ipfsHash) public {
        require(files[_ipfsHash].owner == msg.sender, "Only owner can make file private");
        files[_ipfsHash].isPublic = false;
    }
}
