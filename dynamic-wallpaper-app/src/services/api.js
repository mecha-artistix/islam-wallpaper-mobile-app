const API_KEY = process.env.EXPO_PUBLIC_ISLAMIC_API_KEY;
const LANGUAGE = "en";
const ISLAMIC_API = `https://islamicapi.com/api/v1/asma-ul-husna/?language=en&api_key=${API_KEY}`;

export async function get_asma_ul_husna() {
  console.log(`getQuotes called ${ISLAMIC_API}`);
  const response = await fetch(`${ISLAMIC_API}`, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  const data = await response.json();
  console.log("getQuotes response received");
  return data;
}
