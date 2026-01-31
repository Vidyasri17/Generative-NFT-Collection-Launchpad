const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("NFTLaunchpad", function () {
    let nftContract;
    let owner, addr1, addr2, addr3;
    let merkleTree, merkleRoot, merkleProof1, merkleProof2;

    const MAX_SUPPLY = 1000;
    const ALLOWLIST_PRICE = ethers.parseEther("0.5");
    const PUBLIC_PRICE = ethers.parseEther("1.0");
    const UNREVEALED_URI = "ipfs://unrevealed/";
    const BASE_URI = "ipfs://revealed/";
    const ROYALTY_PERCENTAGE = 500; // 5%

    beforeEach(async function () {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        // Create Merkle tree for allowlist
        const allowlist = [addr1.address, addr2.address];
        const leaves = allowlist.map((addr) => keccak256(addr));
        merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        merkleRoot = merkleTree.getRoot();
        merkleProof1 = merkleTree.getHexProof(keccak256(addr1.address));
        merkleProof2 = merkleTree.getHexProof(keccak256(addr2.address));

        // Deploy contract
        const NFTLaunchpad = await ethers.getContractFactory("NFTLaunchpad");
        nftContract = await NFTLaunchpad.deploy(
            "Test NFT",
            "TNFT",
            MAX_SUPPLY,
            ALLOWLIST_PRICE,
            PUBLIC_PRICE,
            UNREVEALED_URI,
            owner.address,
            ROYALTY_PERCENTAGE
        );
        await nftContract.waitForDeployment();

        // Set merkle root
        await nftContract.setMerkleRoot(merkleRoot);
    });

    describe("Deployment", function () {
        it("Should set correct name and symbol", async function () {
            expect(await nftContract.name()).to.equal("Test NFT");
            expect(await nftContract.symbol()).to.equal("TNFT");
        });

        it("Should set correct max supply", async function () {
            expect(await nftContract.maxSupply()).to.equal(MAX_SUPPLY);
        });

        it("Should set correct prices", async function () {
            expect(await nftContract.allowlistPrice()).to.equal(ALLOWLIST_PRICE);
            expect(await nftContract.publicPrice()).to.equal(PUBLIC_PRICE);
        });

        it("Should set owner correctly", async function () {
            expect(await nftContract.owner()).to.equal(owner.address);
        });

        it("Should start in CLOSED phase", async function () {
            expect(await nftContract.currentPhase()).to.equal(0); // CLOSED
        });

        it("Should set unrevealed URI", async function () {
            expect(await nftContract.unrevealedURI()).to.equal(UNREVEALED_URI);
        });
    });

    describe("Allowlist Minting", function () {
        beforeEach(async function () {
            await nftContract.setPhase(1); // Set to ALLOWLIST phase
        });

        it("Should allow valid allowlist member to mint", async function () {
            await nftContract.connect(addr1).allowlistMint(merkleProof1, 1, {
                value: ALLOWLIST_PRICE,
            });

            expect(await nftContract.balanceOf(addr1.address)).to.equal(1);
            expect(await nftContract.totalSupply()).to.equal(1);
        });

        it("Should mint multiple NFTs in one transaction", async function () {
            await nftContract.connect(addr1).allowlistMint(merkleProof1, 3, {
                value: ALLOWLIST_PRICE * 3n,
            });

            expect(await nftContract.balanceOf(addr1.address)).to.equal(3);
            expect(await nftContract.totalSupply()).to.equal(3);
        });

        it("Should reject invalid Merkle proof", async function () {
            const invalidProof = merkleTree.getHexProof(keccak256(addr3.address));

            await expect(
                nftContract.connect(addr3).allowlistMint(invalidProof, 1, {
                    value: ALLOWLIST_PRICE,
                })
            ).to.be.revertedWithCustomError(nftContract, "InvalidMerkleProof");
        });

        it("Should prevent double claiming", async function () {
            await nftContract.connect(addr1).allowlistMint(merkleProof1, 1, {
                value: ALLOWLIST_PRICE,
            });

            await expect(
                nftContract.connect(addr1).allowlistMint(merkleProof1, 1, {
                    value: ALLOWLIST_PRICE,
                })
            ).to.be.revertedWithCustomError(nftContract, "AllowlistAlreadyClaimed");
        });

        it("Should reject insufficient payment", async function () {
            await expect(
                nftContract.connect(addr1).allowlistMint(merkleProof1, 1, {
                    value: ALLOWLIST_PRICE / 2n,
                })
            ).to.be.revertedWithCustomError(nftContract, "InsufficientPayment");
        });

        it("Should reject minting in wrong phase", async function () {
            await nftContract.setPhase(0); // Set to CLOSED

            await expect(
                nftContract.connect(addr1).allowlistMint(merkleProof1, 1, {
                    value: ALLOWLIST_PRICE,
                })
            ).to.be.revertedWithCustomError(nftContract, "InvalidPhase");
        });

        it("Should enforce max mints per transaction", async function () {
            await nftContract.setMaxMintsPerTransaction(5);

            await expect(
                nftContract.connect(addr1).allowlistMint(merkleProof1, 10, {
                    value: ALLOWLIST_PRICE * 10n,
                })
            ).to.be.revertedWithCustomError(nftContract, "ExceedsMaxMintsPerTx");
        });

        it("Should respect max supply", async function () {
            await nftContract.setMaxSupply(2);

            await nftContract.connect(addr1).allowlistMint(merkleProof1, 2, {
                value: ALLOWLIST_PRICE * 2n,
            });

            await expect(
                nftContract.connect(addr2).allowlistMint(merkleProof2, 1, {
                    value: ALLOWLIST_PRICE,
                })
            ).to.be.revertedWithCustomError(nftContract, "ExceedsMaxSupply");
        });
    });

    describe("Public Minting", function () {
        beforeEach(async function () {
            await nftContract.setPhase(2); // Set to PUBLIC phase
        });

        it("Should allow public mint", async function () {
            await nftContract.connect(addr1).publicMint(1, {
                value: PUBLIC_PRICE,
            });

            expect(await nftContract.balanceOf(addr1.address)).to.equal(1);
            expect(await nftContract.totalSupply()).to.equal(1);
        });

        it("Should allow multiple public mints from same user", async function () {
            await nftContract.connect(addr1).publicMint(2, {
                value: PUBLIC_PRICE * 2n,
            });

            await nftContract.connect(addr1).publicMint(2, {
                value: PUBLIC_PRICE * 2n,
            });

            expect(await nftContract.balanceOf(addr1.address)).to.equal(4);
        });

        it("Should reject public mint in allowlist phase", async function () {
            await nftContract.setPhase(1); // Set to ALLOWLIST

            await expect(
                nftContract.connect(addr1).publicMint(1, {
                    value: PUBLIC_PRICE,
                })
            ).to.be.revertedWithCustomError(nftContract, "InvalidPhase");
        });

        it("Should reject insufficient payment for public mint", async function () {
            await expect(
                nftContract.connect(addr1).publicMint(1, {
                    value: PUBLIC_PRICE / 2n,
                })
            ).to.be.revertedWithCustomError(nftContract, "InsufficientPayment");
        });

        it("Should respect max supply on public mint", async function () {
            await nftContract.setMaxSupply(1);

            await nftContract.connect(addr1).publicMint(1, {
                value: PUBLIC_PRICE,
            });

            await expect(
                nftContract.connect(addr2).publicMint(1, {
                    value: PUBLIC_PRICE,
                })
            ).to.be.revertedWithCustomError(nftContract, "ExceedsMaxSupply");
        });
    });

    describe("Phase Management", function () {
        it("Should update phase correctly", async function () {
            await nftContract.setPhase(1);
            expect(await nftContract.currentPhase()).to.equal(1);

            await nftContract.setPhase(2);
            expect(await nftContract.currentPhase()).to.equal(2);
        });

        it("Should emit PhaseChanged event", async function () {
            await expect(nftContract.setPhase(1))
                .to.emit(nftContract, "PhaseChanged")
                .withArgs(1);
        });

        it("Should return correct phase name", async function () {
            await nftContract.setPhase(1);
            expect(await nftContract.getCurrentPhaseName()).to.equal("ALLOWLIST");

            await nftContract.setPhase(2);
            expect(await nftContract.getCurrentPhaseName()).to.equal("PUBLIC");

            await nftContract.setPhase(0);
            expect(await nftContract.getCurrentPhaseName()).to.equal("CLOSED");
        });

        it("Should only allow owner to change phase", async function () {
            await expect(
                nftContract.connect(addr1).setPhase(1)
            ).to.be.revertedWithCustomError(nftContract, "OwnableUnauthorizedAccount");
        });
    });

    describe("URI Management", function () {
        it("Should return unrevealed URI before reveal", async function () {
            // Mint first to have a valid token
            await nftContract.setPhase(2);
            await nftContract.connect(addr1).publicMint(1, { value: PUBLIC_PRICE });

            const tokenURI = await nftContract.tokenURI(1);
            expect(tokenURI).to.equal(UNREVEALED_URI);
        });


        it("Should return revealed URI after reveal", async function () {
            // Mint first
            await nftContract.setPhase(2);
            await nftContract.connect(addr1).publicMint(1, { value: PUBLIC_PRICE });

            // Set base URI and reveal
            await nftContract.setBaseURI(BASE_URI);
            await nftContract.revealCollection();

            const tokenURI = await nftContract.tokenURI(1);
            expect(tokenURI).to.equal(`${BASE_URI}/1.json`);
        });

        it("Should emit URIUpdated event", async function () {
            await expect(nftContract.setBaseURI(BASE_URI))
                .to.emit(nftContract, "URIUpdated")
                .withArgs(BASE_URI);
        });

        it("Should emit Revealed event", async function () {
            await expect(nftContract.revealCollection())
                .to.emit(nftContract, "Revealed");
        });

        it("Should only allow owner to set URI", async function () {
            await expect(
                nftContract.connect(addr1).setBaseURI(BASE_URI)
            ).to.be.revertedWithCustomError(nftContract, "OwnableUnauthorizedAccount");
        });
    });

    describe("Pause Functionality", function () {
        it("Should pause minting", async function () {
            await nftContract.setPhase(2);
            await nftContract.setPaused(true);

            await expect(
                nftContract.connect(addr1).publicMint(1, { value: PUBLIC_PRICE })
            ).to.be.revertedWithCustomError(nftContract, "EnforcedPause");
        });

        it("Should unpause minting", async function () {
            await nftContract.setPhase(2);
            await nftContract.setPaused(true);
            await nftContract.setPaused(false);

            await expect(
                nftContract.connect(addr1).publicMint(1, { value: PUBLIC_PRICE })
            ).to.not.be.reverted;
        });

        it("Should only allow owner to pause", async function () {
            await expect(
                nftContract.connect(addr1).setPaused(true)
            ).to.be.revertedWithCustomError(nftContract, "OwnableUnauthorizedAccount");
        });
    });

    describe("Withdrawal", function () {
        beforeEach(async function () {
            await nftContract.setPhase(2);
            await nftContract.connect(addr1).publicMint(2, { value: PUBLIC_PRICE * 2n });
        });

        it("Should withdraw contract balance", async function () {
            const initialBalance = await ethers.provider.getBalance(owner.address);
            const contractBalance = await ethers.provider.getBalance(nftContract.target);

            const tx = await nftContract.withdraw();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const finalBalance = await ethers.provider.getBalance(owner.address);

            expect(finalBalance).to.equal(initialBalance + contractBalance - gasUsed);
        });

        it("Should emit Withdrawal event", async function () {
            const contractBalance = await ethers.provider.getBalance(nftContract.target);

            await expect(nftContract.withdraw())
                .to.emit(nftContract, "Withdrawal")
                .withArgs(contractBalance);
        });

        it("Should only allow owner to withdraw", async function () {
            await expect(
                nftContract.connect(addr1).withdraw()
            ).to.be.revertedWithCustomError(nftContract, "OwnableUnauthorizedAccount");
        });

        it("Should reject withdrawal when contract is empty", async function () {
            await nftContract.withdraw();

            await expect(
                nftContract.withdraw()
            ).to.be.revertedWithCustomError(nftContract, "InsufficientPayment");
        });
    });

    describe("Price Management", function () {
        it("Should update allowlist price", async function () {
            const newPrice = ethers.parseEther("0.75");
            await nftContract.setAllowlistPrice(newPrice);
            expect(await nftContract.allowlistPrice()).to.equal(newPrice);
        });

        it("Should update public price", async function () {
            const newPrice = ethers.parseEther("1.5");
            await nftContract.setPublicPrice(newPrice);
            expect(await nftContract.publicPrice()).to.equal(newPrice);
        });

        it("Should only allow owner to update prices", async function () {
            const newPrice = ethers.parseEther("0.75");

            await expect(
                nftContract.connect(addr1).setAllowlistPrice(newPrice)
            ).to.be.revertedWithCustomError(nftContract, "OwnableUnauthorizedAccount");

            await expect(
                nftContract.connect(addr1).setPublicPrice(newPrice)
            ).to.be.revertedWithCustomError(nftContract, "OwnableUnauthorizedAccount");
        });
    });

    describe("Royalty", function () {
        it("Should set royalty correctly", async function () {
            await nftContract.setRoyalty(addr1.address, 1000); // 10%
            expect(await nftContract.royaltyRecipient()).to.equal(addr1.address);
            expect(await nftContract.royaltyPercentage()).to.equal(1000);
        });

        it("Should reject zero address for royalty", async function () {
            await expect(
                nftContract.setRoyalty(ethers.ZeroAddress, 500)
            ).to.be.revertedWithCustomError(nftContract, "ZeroAddress");
        });

        it("Should only allow owner to set royalty", async function () {
            await expect(
                nftContract.connect(addr1).setRoyalty(addr1.address, 500)
            ).to.be.revertedWithCustomError(nftContract, "OwnableUnauthorizedAccount");
        });
    });

    describe("Merkle Root", function () {
        it("Should update merkle root", async function () {
            const newRoot = ethers.id("newRoot");
            await nftContract.setMerkleRoot(newRoot);
            expect(await nftContract.merkleRoot()).to.equal(newRoot);
        });

        it("Should emit MerkleRootUpdated event", async function () {
            const newRoot = ethers.id("newRoot");
            await expect(nftContract.setMerkleRoot(newRoot))
                .to.emit(nftContract, "MerkleRootUpdated")
                .withArgs(newRoot);
        });

        it("Should verify correct allowlist membership", async function () {
            const isAllowlisted = await nftContract.isAllowlisted(addr1.address, merkleProof1);
            expect(isAllowlisted).to.be.true;
        });

        it("Should reject invalid allowlist membership", async function () {
            const isAllowlisted = await nftContract.isAllowlisted(addr3.address, merkleProof1);
            expect(isAllowlisted).to.be.false;
        });
    });

    describe("Contract Details", function () {
        it("Should return correct contract details", async function () {
            await nftContract.setPhase(2);
            await nftContract.connect(addr1).publicMint(5, { value: PUBLIC_PRICE * 5n });

            const details = await nftContract.getContractDetails();

            expect(details._maxSupply).to.equal(MAX_SUPPLY);
            expect(details._totalSupply).to.equal(5);
            expect(details._allowlistPrice).to.equal(ALLOWLIST_PRICE);
            expect(details._publicPrice).to.equal(PUBLIC_PRICE);
            expect(details._revealed).to.be.false;
            expect(details._nextTokenId).to.equal(6);
        });
    });

    describe("Max Mints Per Transaction", function () {
        it("Should update max mints per transaction", async function () {
            await nftContract.setMaxMintsPerTransaction(20);
            expect(await nftContract.maxMintsPerTransaction()).to.equal(20);
        });

        it("Should only allow owner to update max mints", async function () {
            await expect(
                nftContract.connect(addr1).setMaxMintsPerTransaction(20)
            ).to.be.revertedWithCustomError(nftContract, "OwnableUnauthorizedAccount");
        });
    });
});