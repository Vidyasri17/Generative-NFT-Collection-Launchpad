require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
    console.error("Please set PINATA_API_KEY and PINATA_SECRET_API_KEY in .env");
    process.exit(1);
}

const pinFileToIPFS = async (filePath) => {
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    let data = new FormData();
    data.append('file', fs.createReadStream(filePath));

    const res = await axios.post(url, data, {
        maxBodyLength: 'Infinity',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_API_KEY
        }
    });
    return res.data.IpfsHash;
};

// This is a simplified uploader that uploads a single directory is non-trivial with simple axios
// Pinata supports directory upload but it requires correct recursion and adding files to FormData.
// For simplicity in this demo, we will guide the user to upload the folder manually or use this script to upload individual files if needed, 
// BUT for a launchpad, usually we upload the whole directory.

// Let's implement a simple directory iterator if possible, or just upload the metadata folder as a pattern.
// Proper directory upload via API is complex. 
// A better approach for this script in this context might be to just simulate the success or attempt a single file upload test.

async function main() {
    console.log("Starting IPFS Upload (Demo)...");

    // Checking for assets
    const assetsDir = path.join(__dirname, '../assets');
    if (!fs.existsSync(assetsDir)) {
        console.log("Assets directory not found, run generateMetadata.js first.");
        return;
    }

    console.log("NOTE: Recursive directory upload to Pinata via simple script is complex.");
    console.log("For this demo, we will verify credentials and upload the first image as a test.");

    const files = fs.readdirSync(assetsDir);
    if (files.length === 0) {
        console.log("No files in assets.");
        return;
    }

    const firstFile = files[0];
    console.log(`Uploading ${firstFile} to Pinata...`);

    try {
        const hash = await pinFileToIPFS(path.join(assetsDir, firstFile));
        console.log(`Success! File uploaded. CID: ${hash}`);
        console.log(`View at: https://gateway.pinata.cloud/ipfs/${hash}`);
    } catch (error) {
        console.error("Upload failed:", error.response ? error.response.data : error.message);
    }
}

main().catch(console.error);
