import { WsProvider, Keyring, ApiPromise } from '@polkadot/api';
import { cryptoWaitReady, checkAddress } from '@polkadot/util-crypto';
import { u8aToHex, hexToU8a, stringToU8a, u8aConcat } from '@polkadot/util';
import { blake2AsU8a } from '@polkadot/util-crypto/blake2';
import express, { Request, Response, NextFunction } from 'express';
import { config } from 'dotenv';
import expressip from 'express-ip';
import Storage from '../storage';
import ethereum_address from 'ethereum-address';
import chainConfigs from './chainConfigs';

const router = express.Router();
router.use(expressip().getIpInfoMiddleware);
config();
const storage = new Storage();
const keyring = new Keyring({ type: 'sr25519' });

function checkAndConvertEthAddressToSubstrateAddress(address) {
    if(ethereum_address.isAddress(address)) {
        const addr = hexToU8a(address);
        const data = stringToU8a('evm:');
        const res = blake2AsU8a(u8aConcat(data, addr));
        return res;
    }
    return keyring.decodeAddress(address);
}

function changeAddressEncoding(address, networkPrefix){
    if(!address) {
        return null;
    }

    const pubKey = checkAndConvertEthAddressToSubstrateAddress(address);
    const encodedAddress = keyring.encodeAddress(pubKey, networkPrefix);

    if(encodedAddress == process.env.ADDRESS) {
        return null;
    }
    return encodedAddress;
}

function checkAmount(amount) {
    const MAX_TOKEN = Number(MAX_TOKEN);
    amount = Number(amount);
    if(isNaN(amount)) {
        return {checkAmountMessage: "Amount should be a number!", checkAmountIsValid: false}
    } else if(amount <= 0 || amount > MAX_TOKEN) {
        return {checkAmountMessage: `Amount should be within 0 and ${MAX_TOKEN}`, checkAmountIsValid: false}
    } else {
        return {checkAmountMessage: "Valid", checkAmountIsValid: true, validAmount: amount}
    }
}

router.get('/', async (req: any, res: Response, next: NextFunction) => {
    const address = changeAddressEncoding(req.query.address.toString(), networkPrefix);
    let { chain, amount } = req.query;

    const sender = req.ipInfo.ip;
    const tokenDecimals = Number(TOKEN_DECIMALS);

    const limit = Number(process.env.REQUEST_LIMIT) || 3;
    const mnemonic = process.env.FAUCET_ACCOUNT_MNEMONIC?.toString();
    const wsProvider = new WsProvider(RPC_URL);

    chain = chain?.toString().toLowerCase();

    const chainConfig = chainConfigs[chain];
    const { TOKEN_SYMBOL, RPC_URL, TOKEN_DECIMALS, networkPrefix, MAX_TOKEN } = chainConfig;

    // put checks here according to IP address and address requesting
    const allowed = await storage.isValid(sender, address, chain, limit);

    async function run() {
        const api = await ApiPromise.create({ provider: wsProvider });

        await cryptoWaitReady();
        const transferValue = amount * 1e18 // EDG to weiEDG
        let account;
        if (mnemonic) account = keyring.addFromUri(mnemonic);

        try {
            if (address && account) {
                let bal: any = await api.query.system.account(account.address)
                console.log("bal: ", Number(bal.data.free), "amount: ", transferValue)
                if (Number(bal.data.free) > 0 && Number(bal.data.free) > transferValue) {
                    const txHash = await api.tx.balances
                        .transfer(address.toString(), transferValue.toString())
                        .signAndSend(account);
                    await storage.saveData(sender, address, chain);
                    let bal: any = await api.query.system.account(account.address)
                    console.log(`Remaining balance in Faucet ${account.address} ${bal.data.free.toHuman()}.`);
                    return txHash
                }
                else {
                    console.log(`Remaining balance in Faucet ${bal.data.free}.`);
                    return -1;
                }
            }
        } catch (error) {
            res.json({ trxHash: String(error), msg: `Something went wrong.\n Try again later.` });
        }
    }
    if (!allowed) {
        res.json({ trxHash: -1, msg: `You have reached your limit for now.\n Please try again later.` });
    } else {
        const { checkAmountMessage, checkAmountIsValid, validAmount } = checkAmount(amount);
        if (checkAmountIsValid) {
            amount = validAmount;
            if (address && checkAddress(address.toString(), networkPrefix)[0]) {
                const hash = await run();
                if (hash === -1) {
                    res.json({ trxHash: hash, msg: `Sorry! Insufficient ${TOKEN_SYMBOL} balance in the faucet.` });
                } else {
                    res.json({ trxHash: hash, msg: `${amount} ${TOKEN_SYMBOL} transferred to ${address}.` });
                }
            } else {
                res.json({ trxHash: -1, msg: `The address is not valid for the selected chain.` })
            }
        } else {
            res.status(500).send({msg: checkAmountMessage})
        }
    }
});

export default router;
