'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import nftAbi from '../constants/abi.json';
import allowlist from '../constants/allowlist.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export const Minting = () => {
    const { address, isConnected } = useAccount();
    const [quantity, setQuantity] = useState(1);
    const [merkleProof, setMerkleProof] = useState<string[]>([]);
    const [isAllowlisted, setIsAllowlisted] = useState(false);

    const { data: currentPhase } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: nftAbi,
        functionName: 'currentPhase',
    });

    const { data: publicPrice } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: nftAbi,
        functionName: 'publicPrice',
    });

    const { data: allowlistPrice } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: nftAbi,
        functionName: 'allowlistPrice',
    });

    const { data: totalSupply } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: nftAbi,
        functionName: 'totalSupply',
    });

    const { data: maxSupply } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: nftAbi,
        functionName: 'maxSupply',
    });

    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    useEffect(() => {
        if (address && allowlist) {
            const leaves = allowlist.map((addr: string) => keccak256(addr));
            const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
            const leaf = keccak256(address);
            const proof = tree.getHexProof(leaf);
            setMerkleProof(proof);

            // Check if address is in allowlist (simple client-side check for UI)
            setIsAllowlisted(allowlist.includes(address));
        }
    }, [address]);

    const handleMint = async () => {
        if (!address || !CONTRACT_ADDRESS) return;

        try {
            if (currentPhase === 1) { // ALLOWLIST
                if (!isAllowlisted) {
                    alert("You are not on the allowlist!");
                    return;
                }
                await writeContract({
                    address: CONTRACT_ADDRESS,
                    abi: nftAbi,
                    functionName: 'allowlistMint',
                    args: [merkleProof, BigInt(quantity)],
                    value: (allowlistPrice as bigint) * BigInt(quantity),
                });
            } else if (currentPhase === 2) { // PUBLIC
                await writeContract({
                    address: CONTRACT_ADDRESS,
                    abi: nftAbi,
                    functionName: 'publicMint',
                    args: [BigInt(quantity)],
                    value: (publicPrice as bigint) * BigInt(quantity),
                });
            } else {
                alert("Sale is not active or closed.");
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (!isConnected) return <div className="text-center mt-10">Please connect your wallet to mint.</div>;

    const phaseName = currentPhase === 1 ? 'Allowlist Phase' : currentPhase === 2 ? 'Public Phase' : 'Closed';
    const price = currentPhase === 1 ? allowlistPrice : publicPrice;

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-slate-800 rounded-xl shadow-lg border border-slate-700 text-white">
            <h2 className="text-2xl font-bold mb-4 text-center text-cyan-400">Mint Your NFT</h2>

            <div className="mb-4 space-y-2">
                <div className="flex justify-between">
                    <span className="text-gray-400">Phase:</span>
                    <span className="font-semibold">{phaseName}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Price:</span>
                    <span>{price ? (Number(price) / 1e18).toString() : '0'} ETH</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Total Minted:</span>
                    <span>{totalSupply?.toString() || '0'} / {maxSupply?.toString() || '1000'}</span>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6 bg-slate-700 p-2 rounded-lg">
                <button
                    className="px-4 py-2 bg-slate-600 rounded hover:bg-slate-500 disabled:opacity-50"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                >
                    -
                </button>
                <span className="font-bold text-xl">{quantity}</span>
                <button
                    className="px-4 py-2 bg-slate-600 rounded hover:bg-slate-500 disabled:opacity-50"
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    disabled={quantity >= 10}
                >
                    +
                </button>
            </div>

            <button
                onClick={handleMint}
                disabled={isPending || isConfirming || currentPhase === 0}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-bold text-lg hover:from-cyan-400 hover:to-blue-400 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
            >
                {isPending || isConfirming ? 'Minting...' : 'Mint Now'}
            </button>

            {error && (
                <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm break-words">
                    Error: {(error as any).shortMessage || error.message}
                </div>
            )}

            {isConfirmed && (
                <div className="mt-4 p-3 bg-green-900/50 border border-green-500 rounded text-green-200 text-center">
                    Success! Transaction confirmed.
                    <div className="text-xs mt-1 truncate opacity-75">Hash: {hash}</div>
                </div>
            )}
        </div>
    );
};
