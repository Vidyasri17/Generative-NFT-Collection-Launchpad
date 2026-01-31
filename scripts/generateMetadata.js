const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../assets');
const METADATA_DIR = path.join(__dirname, '../metadata');
const COUNT = 10;

// Ensure directories exist
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });
if (!fs.existsSync(METADATA_DIR)) fs.mkdirSync(METADATA_DIR, { recursive: true });

const generateSVG = (index) => {
    const hue = (index * 360 / COUNT) % 360;
    return `<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="hsl(${hue}, 70%, 50%)" />
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="50" fill="white">NFT #${index}</text>
          </svg>`;
};

async function main() {
    console.log(`Generating ${COUNT} NFTs...`);

    for (let i = 1; i <= COUNT; i++) {
        // 1. Generate Image
        const svgContent = generateSVG(i);
        const imagePath = path.join(ASSETS_DIR, `${i}.svg`);
        fs.writeFileSync(imagePath, svgContent);

        // 2. Generate Metadata
        // Note: We are using a placeholder CID for the image. 
        // In a real flow, you'd upload images first, get the CID, then generate metadata.
        // For this script, we will just put a placeholder.
        const metadata = {
            name: `Generative NFT #${i}`,
            description: "A unique generative NFT part of the Launchpad collection.",
            image: `ipfs://REPLACE_WITH_IMAGE_CID/${i}.svg`,
            attributes: [
                { trait_type: "Background", value: `Hue ${Math.round((i * 360 / COUNT) % 360)}` },
                { trait_type: "ID", value: i.toString() }
            ]
        };

        const metadataPath = path.join(METADATA_DIR, `${i}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    console.log("Generation complete!");
    console.log(`Images: ${ASSETS_DIR}`);
    console.log(`Metadata: ${METADATA_DIR}`);
}

main().catch(console.error);
