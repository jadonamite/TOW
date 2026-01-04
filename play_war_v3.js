require('dotenv').config();
const { ethers } = require("ethers");

// --- CONFIGURATION ---
const CONTRACT_ADDRESS = "0x432797F45FD2170B4554db426D5be514a6451494"; 
const RPC_URL = process.env.RPC_URL;
const BATCH_SIZE = 50; // Moves per round
const BREAK_TIME_SECONDS = 180; // 3 Minutes

// Load Keys
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

// --- HELPER: COUNTDOWN TIMER ---
async function sleepWithCountdown(seconds) {
    process.stdout.write("   ⏳ Next round in: ");
    for (let i = seconds; i > 0; i--) {
        process.stdout.write(`${i}s... `);
        // Move cursor back to overwrite the number next second
        process.stdout.moveCursor(-(i.toString().length + 4), 0);
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log("GO! 🚀              "); // Clear line
}

async function main() {
    console.log("⚔️  WAR BOT INITIALIZED (Endless Mode)");
    console.log(`🎯 Config: ${BATCH_SIZE} moves per round, ${BREAK_TIME_SECONDS}s break.`);
    
    // Setup Provider (Static for better stability)
    const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });
    
    // Setup Wallets
    const wallets = PRIVATE_KEYS_LIST.map(key => new ethers.Wallet(key, provider));
    console.log(`✅ Loaded ${wallets.length} wallets.`);

    let roundNumber = 1;

    // --- INFINITE LOOP ---
    while (true) {
        console.log(`\n=============================`);
        console.log(`🔔 STARTING ROUND ${roundNumber}`);
        console.log(`=============================`);

        for (let i = 0; i < BATCH_SIZE; i++) {
            const randomWallet = wallets[Math.floor(Math.random() * wallets.length)];
            const gameContract = new ethers.Contract(CONTRACT_ADDRESS, minimalABI, randomWallet);
            const isTeamUp = Math.random() < 0.5; 
            
            try {
                // Fetch nonce manually for safety
                const nonce = await provider.getTransactionCount(randomWallet.address, "latest");
                const txOptions = { nonce: nonce };

                let tx;
                const walletShort = `...${randomWallet.address.slice(-4)}`;

                if (isTeamUp) {
                    process.stdout.write(`Step ${i+1}/${BATCH_SIZE}: ${walletShort} UP ⬆️ `);
                    tx = await gameContract.pullUp(txOptions);
                } else {
                    process.stdout.write(`Step ${i+1}/${BATCH_SIZE}: ${walletShort} DOWN ⬇️ `);
                    tx = await gameContract.pullDown(txOptions);
                }
                
                console.log(` -> ${tx.hash.slice(0, 10)}...`);
                
            } catch (error) {
                console.log(""); // New line
                if (error.code === 'NONCE_EXPIRED' || error.message.includes('nonce')) {
                    console.warn(`   ⚠️  Nonce Error (Retrying next loop)`);
                } else if (error.code === 'TIMEOUT') {
                    console.warn(`   ⚠️  RPC Timeout`);
                } else {
                    console.error(`   ⚠️  Error: ${error.shortMessage || "Unknown"}`);
                }
            }
            
            // Short delay between moves to be kind to the RPC
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log(`\n🛑 Round ${roundNumber} Finished.`);
        
        // 3-Minute Break
        await sleepWithCountdown(BREAK_TIME_SECONDS);
        
        roundNumber++;
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});