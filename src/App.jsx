import { useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { Upload, FileText, Wallet, Loader2, CheckCircle, Box, ShieldCheck } from 'lucide-react';

// --- CONFIGURATION ---
// 1. RE-PASTE your Contract Address here
const CONTRACT_ADDRESS = "0xF683A9d0133A4fBcE11b71AAA46AED46eD14c379"; 

// 2. RE-PASTE your Pinata JWT here
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI4NzM3YzBkYS01ZWZhLTQzZTgtODcwZC0xYjk3YTlkNWJmMWUiLCJlbWFpbCI6InBjbGE0OTk5MUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYTEzNmM2NGNlZGE2ZjgzODI4YTkiLCJzY29wZWRLZXlTZWNyZXQiOiIxOTE5NjJkMTAyMzcwNjY2MWRhNWI2ZTBiYmJlZmI4ZjU1MTJmYThkYTFlNTVhY2MwZjBiNmY5YmY5NWZjODU0IiwiZXhwIjoxODAyMjM4NzYwfQ.xcHgia4UhgQgPUjqFyVjNRoUk4YySkyVcg9Dhb_M_Hg";
// ---------------------

const CONTRACT_ABI = [
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_ipfsHash",
				"type": "string"
			}
		],
		"name": "uploadFile",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_user",
				"type": "address"
			}
		],
		"name": "getFile",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "ipfsHash",
				"type": "string"
			}
		],
		"name": "FileUploaded",
		"type": "event"
	}
];

function App() {
  const [account, setAccount] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [currentHash, setCurrentHash] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        fetchUserFile(address, provider);
      } catch (error) {
        console.error("Connection failed", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const fetchUserFile = async (userAddress, provider) => {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const hash = await contract.getFile(userAddress);
      if (hash) setCurrentHash(hash);
    } catch (error) {
      console.error("Error fetching file:", error);
    }
  };

  const handleUpload = async () => {
    if (!file || !account) return;
    setLoading(true);
    setStatus("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: { 'Authorization': `Bearer ${PINATA_JWT}` }
      });

      const ipfsHash = res.data.IpfsHash;
      setStatus("confirming");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.uploadFile(ipfsHash);
      await tx.wait(); 

      setStatus("success");
      setCurrentHash(ipfsHash);
      setFile(null); // Clear file after upload

    } catch (error) {
      console.error(error);
      setStatus("error");
      alert("Error: " + (error.reason || error.message));
    }
    setLoading(false);
  };

  // UI Helper for drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col items-center justify-center p-4">
      
      {/* Main Glass Card */}
      <div className="w-full max-w-lg bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        
        {/* Background Glow Effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/20 rounded-xl mb-4 text-indigo-300">
            <Box size={32} />
          </div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            De-Drive
          </h1>
          <p className="text-gray-400 text-sm mt-2">Secure. Immutable. Decentralized.</p>
        </div>
        
        {/* Wallet Section */}
        {!account ? (
          <button 
            onClick={connectWallet} 
            className="w-full group relative bg-indigo-600 hover:bg-indigo-700 py-4 rounded-xl font-bold transition-all overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <span className="flex items-center justify-center gap-2">
              <Wallet size={20} /> Connect Wallet
            </span>
          </button>
        ) : (
          <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-white/5 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                <ShieldCheck size={20} />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400 font-medium uppercase">Connected</p>
                <p className="text-sm font-mono text-white truncate w-32">{account.slice(0,6)}...{account.slice(-4)}</p>
              </div>
            </div>
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
          </div>
        )}

        {/* Action Area */}
        {account && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Drag & Drop Zone */}
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${dragActive ? 'border-indigo-400 bg-indigo-500/10 scale-[1.02]' : 'border-gray-600 hover:border-gray-500 bg-slate-800/30'}`}
            >
              <input 
                type="file" 
                onChange={(e) => setFile(e.target.files[0])} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center gap-4">
                <div className={`p-4 rounded-full ${file ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-gray-400'}`}>
                  {file ? <FileText size={32} /> : <Upload size={32} />}
                </div>
                <div>
                  <p className="text-lg font-medium text-white">
                    {file ? file.name : "Drag file here"}
                  </p>
                  {!file && <p className="text-sm text-gray-400 mt-1">or click to browse</p>}
                </div>
              </div>
            </div>

            {/* Upload Button */}
            <button 
              onClick={handleUpload} 
              disabled={loading || !file}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg ${
                loading 
                  ? 'bg-slate-700 cursor-not-allowed text-gray-400' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/25 active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  {status === "uploading" ? "Encrypting to IPFS..." : "Waiting for Blockchain..."}
                </>
              ) : (
                <>
                   Upload Securely
                </>
              )}
            </button>

            {/* Success Message */}
            {status === "success" && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 animate-in zoom-in duration-300">
                <CheckCircle size={20} />
                <span className="font-medium">Upload Complete!</span>
              </div>
            )}

            {/* Result Card */}
            {currentHash && (
              <div className="mt-8 p-1 rounded-2xl bg-gradient-to-r from-slate-700 to-slate-800">
                <div className="bg-slate-900 rounded-xl p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-bold">Your On-Chain File</p>
                  <a 
                    href={`https://gateway.pinata.cloud/ipfs/${currentHash}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between group p-3 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-indigo-500/30"
                  >
                    <div className="flex items-center gap-3 text-indigo-300">
                      <FileText size={20} />
                      <span className="text-sm underline decoration-indigo-500/30 underline-offset-4 group-hover:text-white transition-colors">View Document</span>
                    </div>
                    <div className="text-xs text-gray-600 font-mono group-hover:text-indigo-400 transition-colors">
                      IPFS://{currentHash.slice(0, 6)}...
                    </div>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer / Credits */}
      <p className="mt-8 text-gray-600 text-sm">PCL Project Prototype • {new Date().getFullYear()}</p>
    </div>
  );
}

export default App;