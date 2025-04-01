import * as circomlib from "circomlibjs";  // Import Circom cryptography library

(async () => {
    const poseidon = await circomlib.buildPoseidon();  // Load Poseidon hash function
    const F = poseidon.F;  // Finite field for conversion

    const studentID = 123456;  // Change this to any student ID
    const hash = poseidon([studentID]);  // Compute Poseidon hash

    console.log("✅ Student ID:", studentID);
    console.log("🔑 Public Hash (Poseidon):", F.toString(hash));  // Convert field element to string
})();

