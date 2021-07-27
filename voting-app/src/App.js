import './App.css';

import React, { useState, useEffect } from 'react';

import { AppBar, Link, Toolbar, Typography } from '@material-ui/core';
import { TextField, Button, CircularProgress } from '@material-ui/core';
import { Dialog, DialogTitle, DialogContent, DialogContentText, Snackbar } from '@material-ui/core';
import { RadioGroup, FormControlLabel, Radio } from '@material-ui/core';
import { DataGrid } from '@material-ui/data-grid';
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
                  You rejected the connection! <br/>
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
          <Link href="." color="inherit">
            <Typography variant="h5">Decentralized Voting</Typography>
          </Link>
        </Toolbar>
      </AppBar>
      <Toolbar />


      {
        contract == null? 
          <Setup
            setContract={setContract}
            account={account}
            setOpenSnackbar={setOpenSnackbar}
            setSnackbarMsg={setSnackbarMsg}/>
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

  const [items, setItems] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [voted, setVoted] = useState(false);
  const [closed, setClosed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    setLoading(true);
    (async () => {
      const owner = await contract.methods.owner().call();
      setIsOwner(owner.toLowerCase() === account.toLowerCase());

      const len = await contract.methods.itemCnt().call();
      const promises = Array.from(
        { length: len },
        (_, i) => contract.methods.voteItems(i).call()
      );
      const result = await Promise.all(promises);
      result.forEach((item, i) => item.id = i);
      console.log(result);
      setItems(result);

      contract.events.voteChanged({}, async (_, event) => {
        const idx = event.returnValues.idx;
        console.log(idx);
        let item = await contract.methods.voteItems(idx).call();
        item.id = idx;
        setItems(items => {
          const newItems = items.slice();
          newItems.splice(idx, 1, item);
          return newItems;
        });
      });

      const voted = await contract.methods.voted(account).call();
      setVoted(voted);

      const closed = await contract.methods.closed().call();
      setClosed(closed);

      contract.events.pollClosed({}, async (_, event) => {
        setClosed(true);
      });


      setLoading(false);
    })();
  }, [contract, account]);

  const sendVote = async () => {
    setLoading(true);
    console.log(selected);

    await contract.methods.vote(selected).send({
      from: account,
    }).on('error', (e) => {
      setSnackbarMsg(e.message);
      setOpenSnackbar(true);
    }).then((receipt) => {
      console.log(receipt);
      setVoted(true);
    });

    setLoading(false);
  };

  const sendNewItem = async () => {
    await contract.methods.addItem(newItem).send({
      from: account,
    }).on('confirmation', (e) => {
      setNewItem("");
    }).on('error', (e) => {
      setSnackbarMsg(e.message);
      setOpenSnackbar(true);
    }).then((receipt) => {
      console.log(receipt);
    });
  };

  const closeVoting = async () => {
    setLoading(true);

    await contract.methods.close().send({
      from: account,
    }).on('error', (e) => {
      setSnackbarMsg(e.message);
      setOpenSnackbar(true);
    }).then((receipt) => {
      console.log(receipt);
      setClosed(true);
    });

    setLoading(false);
  };


  return (
    <>
      <div className="section">
        <div>
          <Typography variant="h6">
            Current Contract
          </Typography>
          <Typography variant="h4">
            {contract.options.address}
          </Typography>
          <Typography variant="h6">
            {
              loading?
                "Loading..."
              :
                closed?
                  "The poll is closed, showing the final results"
                :
                  voted?
                    <>
                      You have already voted <br/>
                      The poll is still open, updating results dynamically
                    </>
                  :
                    "Please choose an item to vote!"
            }
          </Typography>
        </div>
      </div>

      {
        loading? 
          <CircularProgress />
        :
        <>
          {
            (!voted && !closed) && 
              <div className="section">
                <div>
                  <RadioGroup value={selected} onChange={(e) => setSelected(parseInt(e.target.value))}>
                    {
                      items.map((item, id) =>
                          <FormControlLabel key={id} value={id} control={<Radio />} label={item.name} />
                      )
                    }
                  </RadioGroup>
                  <Button variant="outlined" color="primary" style={{marginTop: 16}} onClick={sendVote}>
                    Vote!
                  </Button>
                </div>
              </div>
          }

          {
            (voted || closed || isOwner) &&
              <div className="section">
                <div style={{ height: 400, width: 1000 }}>
                  <DataGrid
                    columns={[
                      { field: 'id', headerName: 'ID', width: 200 },
                      { field: 'name', headerName: 'Name', width: 500 },
                      { field: 'votes', headerName: 'Votes', width: 300 },
                    ]}
                    rows={items}
                    disableSelectionOnClick
                  />
                </div>
              </div>
          }

          {
            (isOwner && !closed) &&
              <div className="section">
                <TextField
                  style={{marginRight: 16}}
                  label="New Item"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)} />
                <Button
                  style={{marginRight: 16}}
                  variant="contained"
                  color="primary"
                  onClick={sendNewItem}
                  disabled={loading}>
                    Add
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={closeVoting}
                  disabled={loading}>
                    Close Voting
                </Button>
              </div>
          }
        </>
      }
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
      <div className="section">
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
            Enter
        </Button>
      </div>
      Or...
      <div className="section">
        {
          loading?
            <CircularProgress/>:
            <Button
              variant="contained"
              color="secondary"
              onClick={deployNewContract}>
                Create a new poll
            </Button>
        }
      </div>
    </>
  );
}

export default App;
