import { useState } from 'react';
import CryptoJS from 'crypto-js';
import { ethers } from 'ethers'; // Assuming you used ethers in Prototype 0
import './index.css'; 

// 🛑 PASTE YOUR DATA HERE 🛑
const PINATA_JWT = "0xF683A9d0133A4fBcE11b71AAA46AED46eD14c379";
const CONTRACT_ADDRESS = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI4NzM3YzBkYS01ZWZhLTQzZTgtODcwZC0xYjk3YTlkNWJmMWUiLCJlbWFpbCI6InBjbGE0OTk5MUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYTEzNmM2NGNlZGE2ZjgzODI4YTkiLCJzY29wZWRLZXlTZWNyZXQiOiIxOTE5NjJkMTAyMzcwNjY2MWRhNWI2ZTBiYmJlZmI4ZjU1MTJmYThkYTFlNTVhY2MwZjBiNmY5YmY5NWZjODU0IiwiZXhwIjoxODAyMjM4NzYwfQ.xcHgia4UhgQgPUjqFyVjNRoUk4YySkyVcg9Dhb_M_Hg";
// Make sure to import or define your contract ABI here based on Prototype 0
// const CONTRACT_ABI = [ ... ]; 

function App() {
  const [account, setAccount] = useState("");
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState(""); // New: Encryption Key
  const [status, setStatus] = useState("");
  const [ipfsLink, setIpfsLink] = useState("");

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
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file.");
    if (!password) return alert("Please enter a secret password to encrypt your file.");
    
    try {
      setStatus("🔒 Encrypting file locally...");
      
      // 1. Read the file as a Base64 String
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const fileDataString = reader.result;

        // 2. Encrypt the file data using CryptoJS and the user's password
        const encryptedData = CryptoJS.AES.encrypt(fileDataString, password).toString();

        // 3. Convert the encrypted "gibberish" back into a file format for Pinata
        const encryptedBlob = new Blob([encryptedData], { type: 'text/plain' });
        const encryptedFile = new File([encryptedBlob], file.name + ".enc");

        setStatus("☁️ Uploading encrypted file to IPFS...");

        // 4. Upload to Pinata
        const formData = new FormData();
        formData.append("file", encryptedFile);

        const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${PINATA_JWT}`
          },
          body: formData
        });

        const pinataData = await res.json();
        const cid = pinataData.IpfsHash;

        setStatus("⛓️ Securing CID on Ethereum Sepolia...");

        // 5. Save CID to Smart Contract (Update with your exact Prototype 0 ethers logic)
        const provider = new ethers.BrowserProvider(window.ethereum); // Use Web3Provider for ethers v5
        const signer = await provider.getSigner();
        // const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        // const tx = await contract.yourUploadFunction(cid);
        // await tx.wait();

        setStatus("✅ Successfully stored on-chain!");
        setIpfsLink(`ipfs://${cid}`);
      };
    } catch (error) {
      console.error("Upload failed:", error);
      setStatus("❌ Error uploading file.");
    }
  };

  return (
    <div className="glass-card">
      <h1>De-Drive</h1>
      <p className="subtitle">Secure. Immutable. Decentralized.</p>

      {!account ? (
        <button className="btn-connect" onClick={connectWallet}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
          Connect Wallet
        </button>
      ) : (
        <>
          <div className="upload-zone">
            <input type="file" onChange={handleFileChange} />
            <svg width="40" height="40" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: '10px'}}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ margin: 0, fontWeight: '500' }}>
              {file ? `Selected: ${file.name}` : "Drag file here or click to browse"}
            </p>
          </div>

          {/* New Password Input for Encryption */}
          <input 
            type="password" 
            placeholder="Create a secret password to encrypt..." 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px',
              border: '1px solid #475569', background: 'rgba(15, 23, 42, 0.5)', color: 'white', boxSizing: 'border-box'
            }}
          />

          <button className="btn-primary" onClick={handleUpload} disabled={!file || !password || status.includes("Uploading") || status.includes("Encrypting") || status.includes("Securing")}>
             Securely Store On-Chain
          </button>

          {status && <p className="status-msg">{status}</p>}

          {ipfsLink && (
            <a href={`https://gateway.pinata.cloud/ipfs/${ipfsLink.replace('ipfs://', '')}`} target="_blank" rel="noopener noreferrer" className="success-link">
              <span className="link-text">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: '6px'}}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                View Encrypted Document
              </span>
              <span style={{color: '#4ade80', fontSize: '0.85rem', fontWeight: 'bold'}}>● On-Chain: Active</span>
            </a>
          )}
        </>
      )}
    </div>
  );
}

export default App;