import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import * as snarkjs from "snarkjs";

// Handle __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const wasmPath = path.resolve(__dirname, "build", "StudentIdentity_js", "StudentIdentity.wasm");
const zkeyPath = path.resolve(__dirname, "build", "student_identity.zkey");
const vKeyPath = path.resolve(__dirname, "build", "verification_key.json");
const witnessPath = path.resolve(__dirname, "build", "witness.wtns");
const proofPath = path.resolve(__dirname, "build", "proof.json");
const publicSignalsPath = path.resolve(__dirname, "build", "public.json");

// Function to compute Poseidon hash
async function computePoseidonHash(studentID) {
    const circomlib = await import("circomlibjs");
    const poseidon = await circomlib.buildPoseidon();
    const hash = poseidon.F.toString(poseidon([studentID]));

    console.log(`Computing Poseidon hash for Student ID: ${studentID}`);
    console.log(`Generated Hash: ${hash}`);

    return hash;
}

// Function to generate witness using CLI
async function generateWitness() {
    return new Promise((resolve, reject) => {
        const command = `node build/StudentIdentity_js/generate_witness.js ${wasmPath} input.json ${witnessPath}`;
        console.log("Running:", command);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("Error generating witness:", error);
                reject(error);
            } else {
                console.log(stdout);
                console.log("Witness successfully generated!");
                resolve(true);
            }
        });
    });
}

// Function to generate proof
async function generateProof() {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        JSON.parse(fs.readFileSync("input.json", "utf8")),
        wasmPath,
        zkeyPath
    );
    fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
    fs.writeFileSync(publicSignalsPath, JSON.stringify(publicSignals, null, 2));
    return { proof, publicSignals };
}

// Function to verify proof against the valid students' hashes

async function verifyProof(proof, publicSignals) {
    const vKey = JSON.parse(fs.readFileSync(vKeyPath, "utf8"));

    // Load trusted hashes (public)
    const trustedHashes = JSON.parse(fs.readFileSync("valid_students.json", "utf8"));

    const publicHash = publicSignals[0];
    console.log("Received Public Signal (Hash):", publicHash);

    if (!trustedHashes.includes(publicHash)) {
        console.log("This student hash is NOT recognized as valid.");
        return false;
    }

    // Verify the ZKP using snarkjs
    const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    if (!isValid) {
        console.log("ZKP Proof is invalid!");
        return false;
    }

    return true;
}


// Main Function
async function main() {
    console.log(" Welcome to the Student Verification System ");

    // Get Student ID from command line
    const studentID = parseInt(process.argv[2]);
    if (isNaN(studentID)) {
        console.log(" Please enter a valid Student ID!");
        return;
    }

    // Compute Poseidon hash
    const publicHash = await computePoseidonHash(studentID);

    // Save to input.json
    const inputJson = { student_id: studentID, public_hash: publicHash };
    fs.writeFileSync("input.json", JSON.stringify(inputJson, null, 2));

    console.log(" Saved to input.json:", fs.readFileSync("input.json", "utf8"));

    // Generate witness using CLI
    console.log(" Generating witness...");
    try {
        await generateWitness();
        console.log(" Witness generated!");
    } catch (error) {
        console.error(" Error generating witness:", error);
        return;
    }

    // Generate Proof
    console.log("🔹 Generating proof...");
    try {
        const { proof, publicSignals } = await generateProof();
        console.log("Proof generated!");

        // Verify Proof
        console.log("Verifying proof...");
        const isValid = await verifyProof(proof, publicSignals);

        if (isValid) {
            console.log(" You are a verified student!");
        } else {
            console.log(" Verification failed!");
        }
    } catch (error) {
        console.error(" Error during proof generation:", error);
    }
}

// Run the main function
main();
