import { initStreaming } from "yoga-wasm-web";

export async function loadYoga() {
  const response = await fetch(`https://coconut-xr.github.io/flex/yoga.wasm`);
  return initStreaming(response);
}
