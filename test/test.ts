import {Tonux} from "../src";
import {libNode} from "@tonclient/lib-node";
import {TonClient} from "@tonclient/core";

TonClient.useBinaryLibrary(libNode);

async function main() {
    const tonux = new Tonux(["http://localhost"]);
    const keypair = await tonux.generateKeypair();
    console.log({keypair});

    const keypair2 = await tonux.keyPairFromSecret(keypair.secret);
    console.log({keypair2});

    const wallet = tonux.walletFromKeyPair(keypair);

    console.log('Wallet status (before deploy)', await tonux.getAccountType(await wallet.getAddress()));
    await wallet.deploy({useGiver: true})
    console.log('Wallet status (after deploy)', await tonux.getAccountType(await wallet.getAddress()));

    const walletAddress = await wallet.getAddress();
    console.log({walletAddress});

    const walletBalance = await wallet.getBalance();
    console.log({walletBalance});
}

main();
