import React, {useState} from 'react'
import ReactDOM from 'react-dom/client';

function App() {
  return (
      <div><Child/></div>
  );
}

function Child() {
  const [n, setN] = useState(100)
  return <div onClickCapture={() => setN(n => n + 1)}>{n}</div>;
}


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Child/>)
