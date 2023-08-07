import { useState, useEffect } from 'react';
import { NFTStorage, File } from 'nft.storage'
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import axios from 'axios';

// Components
import Spinner from 'react-bootstrap/Spinner';
import Navigation from './components/Navigation';

// ABIs
import NFT from './abis/NFT.json'

// Config
import config from './config.json';



function App() {
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)
  const[nft,setNFT]= useState(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState(null)
  const [url,setURL]= useState(null)
   const [message, setMessage]=useState(null)
  const [isWaiting, setIsWaiting]= useState(false)

//creating connctn with bc uisng ethers.js(whch turns website into bc webste)
  const loadBlockchainData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)

    //creating JS verrsion of the contract
    const network= await provider.getNetwork()

    const nft= new ethers.Contract(config[network.chainId].nft.address, NFT, provider) //passing address of hardhat n/w, abi and provider
    setNFT(nft) //saving to react state
     
     // const name= await nft.name()
     // console.log("name", name)
  }


  const submitHandler= async(e)=>{
    //e- event handler
    //prevents page from refrshng
    e.preventDefault()

    if(name==="" || description===""){
      window.alert("Please provide a name and description")
      return
    }

    setIsWaiting(true)

    console.log("submitting", name, description);

    // method calls

    //calling the api to genrte img based on desc.
   const imageData=  createImage()

    //upload image to ipfs( nft storage)
    const url= await uploadImage(imageData);
    console.log("url", url)

    //mint mft
    await mintImage(url)
    console.log("Success")

    setIsWaiting(false)
    setMessage("")
  }



const createImage = async () => {
    setMessage("Generating Image...")

//will use hugging face api to talk to stable-diffusion using axios library
   
  //sending API request fr img gnrtn
    // You can replace this with different model API's
    const URL = `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2`

    // Send the request
    const response = await axios({
      url: URL,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REACT_APP_HUGGING_FACE_API_KEY}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        inputs: description, options: { wait_for_model: true },
      }),
      responseType: 'arraybuffer',
    })

 //formatting img
    const type = response.headers['content-type']
    const data = response.data

    const base64data = Buffer.from(data).toString('base64')
    const img = `data:${type};base64,` + base64data // <-- This is so we can render it on the page
    setImage(img) //setting img inside of raect state

    return data
  }



//fn fr uploading img to ipfs
 const uploadImage = async (imageData) => {
    setMessage("Uploading Image...")


  //usng nft storage service to upload img to ipfs for free, using their s/w dvlpmnt kit (imported abve)
    // Create instance to NFT.Storage
    const nftstorage = new NFTStorage({ token: process.env.REACT_APP_NFT_STORAGE_API_KEY })

    // Send request to store image
    const { ipnft } = await nftstorage.store({
      image: new File([imageData], "image.jpeg", { type: "image/jpeg" }),
      name: name,
      description: description,
    })

  
//saving the ipfs url tht comes back
    const url = `https://ipfs.io/ipfs/${ipnft}/metadata.json` //img url of nft tht wl gt minted when putted in sc
    setURL(url)

    return url //saving to react state
  }

 //take ipfs url tht we got & call mint fn on sc to mint nft fr each image
 //also pay the developer some fee
const mintImage=async(tokenURI)=>{
  setMessage("Waiting for Mint..")
  console.log("waiting for mint")

  //gttng account cnnctd from MM 
  //provider-our connctn to bc. signer-> signer frm MM, WHCH rep's acc. and does things like sign txns

   const signer= await provider.getSigner()
   const transaction= await nft.connect(signer).mint(tokenURI,{value: ethers.utils.parseUnits("1","ether") })
   await transaction.wait()
}


  useEffect(() => {
    loadBlockchainData()
  }, [])

  return (
     <div>
      <Navigation account={account} setAccount={setAccount} />

      <div className='form'>
        <form onSubmit={submitHandler}>
          <input type="text" placeholder="Create a name..." onChange={(e) => { setName(e.target.value) }} />
          <input type="text" placeholder="Create a description..." onChange={(e) => setDescription(e.target.value)} />
          <input type="submit" value="Create & Mint" />
        </form>

        <div className="image">
          {!isWaiting && image ? (
            <img src={image} alt="AI generated image" />
          ) : isWaiting ? (
            <div className="image__placeholder">
              <Spinner animation="border" />
              <p>{message}</p>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>

      {!isWaiting && url && (
        <p>
          View&nbsp;<a href={url} target="_blank" rel="noreferrer">Metadata</a>
        </p>
      )}
    </div>
  );
}
   

export default App;
