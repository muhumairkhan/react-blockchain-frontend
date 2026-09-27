import {AppRouter} from "./router"
import { WalletProvider } from "./context/WalletContext"

export const App = () => {
  console.log("index")
  return (
    <WalletProvider>
      <AppRouter />
    </WalletProvider>
  )
}