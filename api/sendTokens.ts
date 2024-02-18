import { VercelRequest, VercelResponse } from '@vercel/node';
import { WsProvider, Keyring, ApiPromise } from '@polkadot/api';
import { cryptoWaitReady, checkAddress } from '@polkadot/util-crypto';
import { hexToU8a, stringToU8a, u8aConcat } from '@polkadot/util';
import { blake2AsU8a } from '@polkadot/util-crypto/blake2';
import Storage from '../backend/src/storage';
import ethereum_address from 'ethereum-address';
import { config } from 'dotenv';
import chainConfigs from '../backend/src/routes/chainConfigs';

config();

const storage = new Storage();
const keyring = new Keyring({ type: 'sr25519' });

function checkAndConvertEthAddressToSubstrateAddress(address: string) {
    if (ethereum_address.isAddress(address)) {
        const addr = hexToU8a(address);
        const data = stringToU8a('evm:');
        const res = blake2AsU8a(u8aConcat(data, addr));
        return res;
    }
    return keyring.decodeAddress(address);
}

function changeAddressEncoding(address: string | undefined, networkPrefix): string | null {
    if (!address) {
        return null;
    }

    const pubKey = checkAndConvertEthAddressToSubstrateAddress(address);
    const encodedAddress = keyring.encodeAddress(pubKey, networkPrefix);

    if (encodedAddress === process.env.ADDRESS) {
        return null;
    }
    return encodedAddress;
}

function checkAmount(amount: string): {
    checkAmountMessage: string;
    checkAmountIsValid: boolean;
    validAmount?: number;
} {
    const MAX_TOKEN = Number(MAX_TOKEN);
    const numericAmount = Number(amount);

    if (isNaN(numericAmount)) {
        return { checkAmountMessage: "Amount should be a number!", checkAmountIsValid: false };
    } else if (numericAmount <= 0 || numericAmount > MAX_TOKEN) {
        return { checkAmountMessage: `Amount should be within 0 and ${MAX_TOKEN}`, checkAmountIsValid: false };
    } else {
        return { checkAmountMessage: "Valid", checkAmountIsValid: true, validAmount: numericAmount };
    }
}

export default async (req: VercelRequest, res: VercelResponse) => {
    if (req.method === 'GET') {
        // Extracting IP address from request headers
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Ensure address and amount are strings
        const addressParam = Array.isArray(req.query.address) ? req.query.address[0] : req.query.address;
        const address = changeAddressEncoding(addressParam?.toString(), networkPrefix);

        let { chain, amount } = req.query;
        amount = typeof amount === 'string' ? amount : "0"; // Default amount to "0" if not a string

        const wsProvider = new WsProvider(RPC_URL);

        chain = typeof chain === 'string' ? chain.toLowerCase() : "";

        const chainConfig = chainConfigs[chain];
        const { TOKEN_SYMBOL, RPC_URL, TOKEN_DECIMALS, networkPrefix, MAX_TOKEN } = chainConfig;

        const allowed = await storage.isValid(ip, address, chain, Number(process.env.REQUEST_LIMIT) || 3);

        async function run() {
            const api = await ApiPromise.create({ provider: wsProvider });

            await cryptoWaitReady();
            const mnemonic = process.env.FAUCET_ACCOUNT_MNEMONIC?.toString();
            let account;
            if (mnemonic) account = keyring.addFromUri(mnemonic);

            try {
                if (address && account) {
                    const transferValue = Number(amount) * 1e18; // Convert amount to number and calculate transfer value
                    let bal: any = await api.query.system.account(account.address);
                    if (Number(bal.data.free) > 0 && Number(bal.data.free) > transferValue) {
                        const txHash = await api.tx.balances
                            .transfer(address, transferValue.toString())
                            .signAndSend(account);
                        await storage.saveData(ip, address, chain);
                        return txHash;
                    } else {
                        console.log(`Insufficient balance.`);
                        return -1;
                    }
                }
            } catch (error) {
                res.json({ trxHash: String(error), msg: `Something went wrong.\n Try again later.` });
                return;
            }
        }
        if (!allowed) {
            res.json({ trxHash: -1, msg: `You have reached your limit for now.\n Please try again later.` });
        } else {
            const { checkAmountMessage, checkAmountIsValid, validAmount } = checkAmount(amount);
            if (checkAmountIsValid) {
                if (address && checkAddress(address, networkPrefix)[0]) {
                    const hash = await run();
                    if (hash === -1) {
                        res.json({ trxHash: hash, msg: `Sorry! Insufficient ${TOKEN_SYMBOL} balance in the faucet.` });
                    } else {
                        res.json({ trxHash: hash, msg: `${validAmount} ${TOKEN_SYMBOL} transferred to ${address}.` });
                    }
                } else {
                    res.json({ trxHash: -1, msg: `The address is not valid for the selected chain.` });
                }
            } else {
                res.status(500).send({ msg: checkAmountMessage });
            }
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
};
