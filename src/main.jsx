import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

import Home from './pages/Home.jsx';
import Error from './pages/Error.jsx';
import About from './pages/About.jsx';
import Other from './pages/Other.jsx';
import Contact from './pages/Contact.jsx';

// Define the accessible routes, and which components respond to which URL
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <Error />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: '/about',
        element: <About />,
      },
      {
        path: '/other',
        element: <Other />,
      },
      {
        path: '/contact',
        element: <Contact />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
);

