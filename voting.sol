// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;

contract Voting {

    address public owner;
    mapping (address => bool) public voted;
    
    struct Item {
        string name;
        uint256 votes;
    }
    
    Item[] public voteItems;
    bool public closed;
    
    modifier isOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    event voteChanged(uint256 idx);
    
    function vote(uint256 idx) public {
        require(!closed, "The voting is closed!");
        require(!voted[msg.sender], "You have already voted!");
        require(idx < voteItems.length, "Invalid index!");
        
        voted[msg.sender] = true;
        voteItems[idx].votes++;
        emit voteChanged(idx);
    }
    
    function close() isOwner public {
        require(!closed, "The voting is already closed!");
        closed = true;
    }
    
    function addItem(string memory name) isOwner public {
        voteItems.push(Item(name, 0));
        emit voteChanged(voteItems.length);
    }
    
    function itemCnt() public view returns (uint256) {
        return voteItems.length;
    }
    
}
