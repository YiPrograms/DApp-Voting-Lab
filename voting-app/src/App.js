import './App.css';

import React, { useState, useEffect } from 'react';

import { AppBar, Toolbar, Typography } from '@material-ui/core';
import { TextField, Button, CircularProgress } from '@material-ui/core';
import { Dialog, DialogTitle, DialogContent, DialogContentText, Snackbar } from '@material-ui/core';
import MuiAlert from '@material-ui/lab/Alert';

import ABI from './abi.json';
import Bytecode from './bytecode.json';

var Web3 = require('web3');
var web3;

function App() {

  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage({
      title: "Connecting...",
      body:
        <>
          Connecting to your ethereum account... <br />
          Please press Allow to continue
        </>
    });
    setOpenDialog(true);

    if (!window.ethereum) {
      const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
      setMessage({
        title: "Please install MetaMask to use this app",
        body:
          <>You can install it <a href={isFirefox?
            "https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/":
            "https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn"}>here</a>!
          </>
      });
      return;
    }
    web3 = new Web3(window.ethereum);


    window.ethereum.request({ method: "eth_requestAccounts"}) // ethereum.enable() is deprecated
    .then((accounts) => {
      setAccount(accounts[0]);
      setOpenDialog(false);
    })
    .catch((e) => {
        console.log(e);
        if (e.code === 4001) {
            // EIP-1193 userRejectedRequest error
            setMessage({
              title: "Please connect to MetaMask!",
              body:
                <>
                  You rejected the connection! <br />
                  Refresh the page to continue
                </>
            });
        } else {
          setMessage({
            title: "Ethereum connection failed!",
            body:
              <>
                Refresh the page to continue
              </>
          });
        }
    })
  }, []);

  return (
    <div className="App">
      <AppBar>
        <Toolbar>
          <Typography variant="h5">Decentralized Voting</Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />


      {
        contract == null? 
          <Setup
            setContract={setContract}
            account={account}
            setOpenSnackbar={setOpenSnackbar}
            setSnackbarMsg={setSnackbarMsg} />
          :<Voting
            contract={contract}
            account={account}
            setOpenSnackbar={setOpenSnackbar}
            setSnackbarMsg={setSnackbarMsg}/>
      }


      <Dialog
        open={openDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{message.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {message.body}
          </DialogContentText>
        </DialogContent>
      </Dialog>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={() => setOpenSnackbar(false)}>
        <MuiAlert elevation={6} variant="filled" onClose={() => setOpenSnackbar(false)} severity="error">
          {snackbarMsg}
        </MuiAlert>
      </Snackbar>
    </div>
  );
}

function Voting({ contract, account, setOpenSnackbar, setSnackbarMsg }) {
  console.log(contract);
  return (
    <>
      <div className="title-div">
        <div>
          <Typography variant="h6">
              Your Contract
          </Typography>
          <Typography variant="h4">
            {contract.options.address}
          </Typography>
        </div>
      </div>
    </>
  )
}

function Setup({ setContract, account, setOpenSnackbar, setSnackbarMsg }) {
  const [loading, setLoading] = useState(false);
  const [contractInput, setContractInput] = useState("");
 
  const connectContract = () => {
    var votingContract = new web3.eth.Contract(ABI, contractInput);
    setContract(votingContract);
  }

  const deployNewContract = () => {
    setLoading(true);

    var votingContract = new web3.eth.Contract(ABI);
    votingContract.deploy({
      data: Bytecode.object, 
    }).send({
        from: account, 
    }).on('error', (e) => {
      setSnackbarMsg(e.message);
      setOpenSnackbar(true);
      setLoading(false);
    }).then((contract) => {
      console.log(contract);
      setContract(contract);
    });
  }

  return(
    <>
      <div className="title-div">
        <TextField
          style={{marginRight: 16}}
          label="Contract Address (0x...)"
          value={contractInput}
          onChange={(e) => setContractInput(e.target.value)} />
        <Button
          variant="contained"
          color="primary"
          onClick={connectContract}
          disabled={loading}>
            Connect
        </Button>
      </div>
      Or...
      <div className="title-div">
        {
          loading?
            <CircularProgress/>:
            <Button
              variant="contained"
              color="secondary"
              onClick={deployNewContract}>
                Create new voting
            </Button>
        }
      </div>
    </>
  );
}

export default App;
