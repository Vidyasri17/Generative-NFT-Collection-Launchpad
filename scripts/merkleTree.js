const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const fs = require('fs');
const path = require('path');

const allowlistPath = path.join(__dirname, 'allowlist.json');

function generateMerkleRoot() {
    // Read allowlist
    if (!fs.existsSync(allowlistPath)) {
        console.error("Allowlist file not found at:", allowlistPath);
        process.exit(1);
    }

    const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));

    // Hash addresses
    const leaves = allowlist.map(addr => keccak256(addr));

    // Create Merkle Tree
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

    // Get Root
    const root = tree.getHexRoot();

    console.log("Allowlist contains", allowlist.length, "addresses");
    console.log("Merkle Root:", root);

    // Example proof for the first address
    const testAddress = allowlist[0];
    const leaf = keccak256(testAddress);
    const proof = tree.getHexProof(leaf);
    console.log("\nProof for:", testAddress);
    console.log(JSON.stringify(proof, null, 2));

    return root;
}

if (require.main === module) {
    generateMerkleRoot();
}

module.exports = { generateMerkleRoot };
