import { createBrowserRouter, RouterProvider,} from "react-router";
import Home  from "./routes/Home"
import Wallet from "./routes/Wallet"

export const AppRouter = () => {
    let router = createBrowserRouter([
        {path: "/", element: <Home />},
        {path: "/wallet", element: <Wallet />},
    ])

    return <RouterProvider router={router} />
}

