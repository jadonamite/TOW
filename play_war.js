require('dotenv').config(); // Load environment variables
const { ethers } = require("ethers");

// --- CONFIGURATION ---
const CONTRACT_ADDRESS = "0x432797F45FD2170B4554db426D5be514a6451494";

// 1. Load RPC URL from .env
const RPC_URL = process.env.RPC_URL;

// 2. Load and Parse Private Keys from .env
// This splits the string by commas and removes any accidental whitespace
const PRIVATE_KEYS_LIST = process.env.PRIVATE_KEYS
    ? process.env.PRIVATE_KEYS.split(',').map(key => key.trim())
    : [];

if (PRIVATE_KEYS_LIST.length === 0) {
    console.error("❌ Error: No private keys found in .env file");
    process.exit(1);
}

// --- THE SCRIPT ---

const minimalABI = [
    "function pullUp() external",
    "function pullDown() external",
    "function gameScore() view returns (int256)",
    "event ScoreUpdate(address indexed player, int256 newScore)"
];

async function main() {
    console.log("⚔️  Reading .env...");
    
    // Connect to Provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Create Wallet Instances from the list
    const wallets = PRIVATE_KEYS_LIST.map(key => new ethers.Wallet(key, provider));
    console.log(`✅ Loaded ${wallets.length} wallets from .env ready to battle.`);
    
    // Listen for events
    const monitorContract = new ethers.Contract(CONTRACT_ADDRESS, minimalABI, provider);
    console.log("👂 Listening for events on chain...");
    
    monitorContract.on("ScoreUpdate", (player, newScore) => {
        // Just showing the last 4 chars of address for cleaner logs
        console.log(`[EVENT] Player ...${player.slice(-4)} moved rope to: ${newScore}`);
    });

    // --- ATTACK LOOP ---
    const iterations = 50; 
    
    for (let i = 0; i < iterations; i++) {
        const randomWallet = wallets[Math.floor(Math.random() * wallets.length)];
        const gameContract = new ethers.Contract(CONTRACT_ADDRESS, minimalABI, randomWallet);
        const isTeamUp = Math.random() < 0.5; 
        
        try {
            let tx;
            if (isTeamUp) {
                console.log(`Step ${i+1}: Wallet ...${randomWallet.address.slice(-4)} pulling UP`);
                tx = await gameContract.pullUp();
            } else {
                console.log(`Step ${i+1}: Wallet ...${randomWallet.address.slice(-4)} pulling DOWN`);
                tx = await gameContract.pullDown();
            }
            console.log(`   -> Tx Sent: ${tx.hash}`);
            
        } catch (error) {
            console.error(`   -> Error: ${error.reason || error.message}`);
        }
        
        // 1.5 second delay to manage nonce issues
        await new Promise(r => setTimeout(r, 1500));
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});