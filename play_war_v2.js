require('dotenv').config();
const { ethers } = require("ethers");

// --- CONFIGURATION ---
const CONTRACT_ADDRESS = "0x432797F45FD2170B4554db426D5be514a6451494"; // Ensure this is deployed on BASE if using Base RPC
const RPC_URL = process.env.RPC_URL;

// Parse Private Keys
const PRIVATE_KEYS_LIST = process.env.PRIVATE_KEYS
    ? process.env.PRIVATE_KEYS.split(',').map(key => key.trim())
    : [];

if (PRIVATE_KEYS_LIST.length === 0) {
    console.error("❌ Error: No private keys found in .env file");
    process.exit(1);
}

const minimalABI = [
    "function pullUp() external",
    "function pullDown() external"
];

async function main() {
    console.log("⚔️  Connecting to Base Mainnet...");
    
    // 1. Static Provider (Better for public nodes than JsonRpcProvider)
    const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });

    // 2. Create Wallet Instances
    const wallets = PRIVATE_KEYS_LIST.map(key => new ethers.Wallet(key, provider));
    console.log(`✅ Loaded ${wallets.length} wallets.`);

    console.log("⚠️  Note: Event listening disabled to prevent RPC 'filter not found' errors.");

    // --- ATTACK LOOP ---
    const iterations = 50; 
    
    for (let i = 0; i < iterations; i++) {
        const randomWallet = wallets[Math.floor(Math.random() * wallets.length)];
        const gameContract = new ethers.Contract(CONTRACT_ADDRESS, minimalABI, randomWallet);
        const isTeamUp = Math.random() < 0.5; 
        
        try {
            // Explicitly fetch the nonce to prevent synchronization errors
            const nonce = await provider.getTransactionCount(randomWallet.address, "latest");

            // Define transaction options
            const txOptions = { nonce: nonce };

            let tx;
            if (isTeamUp) {
                console.log(`Step ${i+1}: ...${randomWallet.address.slice(-4)} pulling UP`);
                tx = await gameContract.pullUp(txOptions);
            } else {
                console.log(`Step ${i+1}: ...${randomWallet.address.slice(-4)} pulling DOWN`);
                tx = await gameContract.pullDown(txOptions);
            }
            
            console.log(`   -> Tx Sent: ${tx.hash}`);
            
        } catch (error) {
            // Clean up error logging
            if (error.code === 'NONCE_EXPIRED' || error.message.includes('nonce')) {
                console.warn(`   -> Retry needed (Nonce Error)`);
            } else if (error.code === 'TIMEOUT') {
                console.warn(`   -> RPC Timeout - Network Congested`);
            } else {
                console.error(`   -> Error: ${error.shortMessage || error.message}`);
            }
        }
        
        // 3. Increased Delay: Public nodes need a breather.
        // Waiting 2 seconds between shots to avoid "429 Too Many Requests"
        await new Promise(r => setTimeout(r, 2000));
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});