import { useState } from 'react';
import CryptoJS from 'crypto-js';
import { ethers } from 'ethers'; 
import './index.css'; 

// 🛑 PASTE YOUR DATA HERE 🛑
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI4NzM3YzBkYS01ZWZhLTQzZTgtODcwZC0xYjk3YTlkNWJmMWUiLCJlbWFpbCI6InBjbGE0OTk5MUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYTEzNmM2NGNlZGE2ZjgzODI4YTkiLCJzY29wZWRLZXlTZWNyZXQiOiIxOTE5NjJkMTAyMzcwNjY2MWRhNWI2ZTBiYmJlZmI4ZjU1MTJmYThkYTFlNTVhY2MwZjBiNmY5YmY5NWZjODU0IiwiZXhwIjoxODAyMjM4NzYwfQ.xcHgia4UhgQgPUjqFyVjNRoUk4YySkyVcg9Dhb_M_Hg";
const CONTRACT_ADDRESS = "0xF683A9d0133A4fBcE11b71AAA46AED46eD14c379";

const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "ipfsHash", "type": "string" }
    ],
    "name": "FileUploaded",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_user", "type": "address" }
    ],
    "name": "getFile",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_ipfsHash", "type": "string" }
    ],
    "name": "uploadFile",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

function App() {
  // App State
  const [account, setAccount] = useState("");
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' or 'retrieve'

  // Upload State
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState(""); 
  const [status, setStatus] = useState("");
  const [ipfsLink, setIpfsLink] = useState("");

  // Retrieve State
  const [retrieveCid, setRetrieveCid] = useState("");
  const [retrievePassword, setRetrievePassword] = useState("");
  const [retrieveStatus, setRetrieveStatus] = useState("");
  const [decryptedFileUrl, setDecryptedFileUrl] = useState("");

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
      } catch (error) {
        console.error("Wallet connection failed:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) setFile(e.target.files[0]);
  };

  // --- PHASE 1: ENCRYPT & UPLOAD ---
  const handleUpload = async () => {
    if (!file) return alert("Please select a file.");
    if (!password) return alert("Please enter a secret password.");
    
    try {
      setStatus("🔒 Encrypting file locally...");
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const fileDataString = reader.result;
        const encryptedData = CryptoJS.AES.encrypt(fileDataString, password).toString();
        
        const encryptedBlob = new Blob([encryptedData], { type: 'text/plain' });
        const encryptedFile = new File([encryptedBlob], file.name + ".enc");

        setStatus("☁️ Uploading encrypted file to IPFS...");
        const formData = new FormData();
        formData.append("file", encryptedFile);

        const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
          method: "POST",
          headers: { "Authorization": `Bearer ${PINATA_JWT}` },
          body: formData
        });

        const pinataData = await res.json();
        const cid = pinataData.IpfsHash;

        setStatus("⛓️ Securing CID on Ethereum Sepolia...");
        
        // 1. Connect to MetaMask
        const provider = new ethers.BrowserProvider(window.ethereum); 
        const signer = await provider.getSigner();
        
        // 2. Connect to your specific contract
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        // 3. Call the EXACT function from your .sol file (uploadFile)
        const tx = await contract.uploadFile(cid);
        
        setStatus("⏳ Waiting for blockchain confirmation (this takes a few seconds)...");
        
        // 4. Wait for the block to be mined
        await tx.wait();

        setStatus("✅ Successfully stored on-chain!");
        setIpfsLink(cid);
      };
    } catch (error) {
      console.error(error);
      setStatus("❌ Error uploading file.");
    }
  };

  // --- PHASE 2: FETCH & DECRYPT ---
  const handleRetrieve = async () => {
    if (!retrieveCid || !retrievePassword) return alert("Please provide both CID and Password.");
    
    try {
      setRetrieveStatus("☁️ Fetching encrypted file from IPFS...");
      setDecryptedFileUrl(""); // Clear previous results
      
      // 1. Fetch the raw encrypted text from Pinata Gateway
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${retrieveCid}`);
      if (!res.ok) throw new Error("Could not fetch file from IPFS.");
      const ciphertext = await res.text();

      setRetrieveStatus("🔓 Decrypting with your password...");

      // 2. Decrypt using the provided password
      const bytes = CryptoJS.AES.decrypt(ciphertext, retrievePassword);
      const originalBase64 = bytes.toString(CryptoJS.enc.Utf8);

      // 3. Check if decryption actually worked (wrong password returns empty/malformed string)
      if (!originalBase64) {
        throw new Error("Incorrect password.");
      }

      setDecryptedFileUrl(originalBase64);
      setRetrieveStatus("✅ Decrypted successfully!");

    } catch (error) {
      console.error(error);
      setRetrieveStatus("❌ Decryption failed. Are you sure that is the right password?");
    }
  };

  // --- UI RENDER ---
  return (
    <div className="glass-card">
      <h1>De-Drive</h1>
      <p className="subtitle">Secure. Immutable. Decentralized.</p>

      {!account ? (
        <button className="btn-connect" onClick={connectWallet}>
          Connect Wallet
        </button>
      ) : (
        <>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button 
              onClick={() => setActiveTab("upload")}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: activeTab === 'upload' ? '#4f46e5' : 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Upload & Encrypt
            </button>
            <button 
              onClick={() => setActiveTab("retrieve")}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: activeTab === 'retrieve' ? '#4f46e5' : 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Retrieve & Decrypt
            </button>
          </div>

          {/* UPLOAD TAB */}
          {activeTab === "upload" && (
            <div className="tab-content">
              <div className="upload-zone">
                <input type="file" onChange={handleFileChange} />
                <p style={{ margin: 0, fontWeight: '500' }}>
                  {file ? `Selected: ${file.name}` : "Drag file here or click to browse"}
                </p>
              </div>
              <input 
                type="password" 
                placeholder="Create a secret password..." 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px', border: '1px solid #475569', background: 'rgba(15, 23, 42, 0.5)', color: 'white', boxSizing: 'border-box' }}
              />
              <button className="btn-primary" onClick={handleUpload} disabled={!file || !password || status.includes("ing")}>
                 Securely Store On-Chain
              </button>
              {status && <p className="status-msg">{status}</p>}
              {ipfsLink && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', border: '1px solid #4ade80', wordBreak: 'break-all' }}>
                  <span style={{ color: '#4ade80', fontWeight: 'bold' }}>Success! Your CID is:</span><br/>
                  <span style={{ color: 'white', fontSize: '0.9rem' }}>{ipfsLink}</span><br/>
                  <small style={{ color: '#94a3b8' }}>Copy this CID. You will need it to retrieve your file.</small>
                </div>
              )}
            </div>
          )}

          {/* RETRIEVE TAB */}
          {activeTab === "retrieve" && (
            <div className="tab-content">
              <input 
                type="text" 
                placeholder="Paste your IPFS CID here..." 
                value={retrieveCid}
                onChange={(e) => setRetrieveCid(e.target.value.trim())}
                style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #475569', background: 'rgba(15, 23, 42, 0.5)', color: 'white', boxSizing: 'border-box' }}
              />
              <input 
                type="password" 
                placeholder="Enter your decryption password..." 
                value={retrievePassword}
                onChange={(e) => setRetrievePassword(e.target.value)}
                style={{ width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px', border: '1px solid #475569', background: 'rgba(15, 23, 42, 0.5)', color: 'white', boxSizing: 'border-box' }}
              />
              <button className="btn-primary" onClick={handleRetrieve} disabled={!retrieveCid || !retrievePassword || retrieveStatus.includes("ing")}>
                 Fetch & Decrypt
              </button>
              {retrieveStatus && <p className="status-msg">{retrieveStatus}</p>}
              
              {decryptedFileUrl && (
                <a href={decryptedFileUrl} download="decrypted_file" className="success-link" style={{ textAlign: 'center', display: 'block' }}>
                  <span className="link-text">📥 Download Unlocked File</span>
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;