const endpoints = [
  { path: "https://www.willingways.uk/", label: "voice home" },
  { path: "https://www.willingways.uk/api/runtime", label: "runtime status" },
  { path: "https://www.willingways.uk/api/booking", label: "booking proxy (OPTIONS)", options: { method: "OPTIONS" } },
];

async function run() {
  for (const endpoint of endpoints) {
    const response = await fetch(endpoint.path, endpoint.options);
    if (!response.ok) {
      throw new Error(`Smoke check failed for ${endpoint.label}: ${response.status}`);
    }
    console.log(`${endpoint.label}: ${response.status}`);
  }
  console.log("voice home smoke checks passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
