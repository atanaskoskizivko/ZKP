pragma circom 2.1.9;

include "../circomlib/circuits/poseidon.circom";

template StudentIdentity()
{
    signal input student_id;     
    signal input public_hash;    
    signal output hash;          
    component poseidon = Poseidon(1);  
    poseidon.inputs[0] <== student_id;
    hash <== poseidon.out;
    
    hash === public_hash;
}

component main = StudentIdentity();
