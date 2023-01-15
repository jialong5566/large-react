import React, {useState} from 'react'
import ReactDOM from 'react-dom/client';

function App() {
  return (
      <div><Child/></div>
  );
}

function Child() {
  const [n, setN] = useState(100)
  window.setN = setN;
  return n;
}


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Child/>)
