import { initStreaming } from "yoga-wasm-web";
import { loadYogaBase64 } from './load-base64.js'
export async function loadYoga() {
    try{
        const response = await fetch(`https://coconut-xr.github.io/flex/yoga.wasm`);
        return initStreaming(response);
    } catch (error) {
        console.log("Cannot retrieve yoga.wasm from remote host. Error: " + error);
        console.log("Returning local yoga.wasm file")
        return loadYogaBase64();
    }
}
