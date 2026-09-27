import { createBrowserRouter, RouterProvider } from "react-router";
import Layout from "./Layout";
import Home from "./routes/Home";
import Wallet from "./routes/Wallet";

export const AppRouter = () => {
  const router = createBrowserRouter([
    {
      element: <Layout />,
      children: [
        { path: "/", element: <Home /> },
        { path: "/wallet", element: <Wallet /> },
      ],
    },
  ]);

  return <RouterProvider router={router} />;
};