import React, { useEffect } from "react";
import ConnectWallet from "./components/connectWallet";

function App() {
  useEffect(() => {
    document.title = "🐻‍❄️ Logic Exchange";
  }, []);
  return (
    <div>
      <ConnectWallet />
    </div>
  );
}

export default App;
